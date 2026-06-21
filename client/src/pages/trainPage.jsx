import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Button, Row, Col, Card, Alert, Spinner, Badge } from 'react-bootstrap';
import API from '../api/api.js';
import {NetworkMap} from '../components/networkMap.jsx';
import {Timer} from '../components/timer.jsx';


// PHASE CONSTANTS 
const PHASE = { SETUP: 'setup', PLANNING: 'planning', EXECUTION: 'execution', RESULT: 'result' };

function GamePage() {
  const [phase, setPhase] = useState(PHASE.SETUP);
  const [network, setNetwork] = useState(null);
  const [segments, setSegments] = useState(null);
  const [gameSetup, setGameSetup] = useState(null);   // { startStation, endStation }
  const [route, setRoute] = useState([]);              // array of station IDs
  const [result, setResult] = useState(null);          // { valid, score, steps }
  const [execStep, setExecStep] = useState(0);         // current step in execution
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const timerExpiredRef = useRef(false);

  // Load network on mount
  useEffect(() => {
    API.getNetwork()
      .then(setNetwork)
      .catch(err => setError(err.message));
  }, []);

  // setup planning
  const handleStartPlanning = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [setup, segs] = await Promise.all([API.startGame(), API.getSegments()]);
      setGameSetup(setup);
      setSegments(segs);
      setRoute([setup.startStation.id]);
      timerExpiredRef.current = false;
      setPhase(PHASE.PLANNING);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  //  route building 
  const addSegment = useCallback((segA, segB) => {
    setRoute(prev => {
      const last = prev[prev.length - 1];
      // Determine which end of the segment to add
      let nextId = null;
      if (last === segA) nextId = segB;
      else if (last === segB) nextId = segA;
      if (nextId === null) return prev; // segment doesn't connect to current end
      if (prev.includes(nextId)) return prev; // no cycles
      return [...prev, nextId];
    });
  }, []);

  const removeLastStation = useCallback(() => {
    setRoute(prev => prev.length > 1 ? prev.slice(0, -1) : prev);
  }, []);

  //  Planning → Execution 
  const submitRoute = useCallback(async (finalRoute) => {
    if (!gameSetup) return;
    setLoading(true);
    setError('');
    try {
      const res = await API.submitRoute(
        finalRoute,
        gameSetup.startStation.id,
        gameSetup.endStation.id
      );
      setResult(res);
      setExecStep(0);
      setPhase(res.valid && res.steps.length > 0 ? PHASE.EXECUTION : PHASE.RESULT);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gameSetup]);

  const handleTimerExpire = useCallback(() => {
    if (!timerExpiredRef.current) {
      timerExpiredRef.current = true;
      submitRoute(route);
    }
  }, [route, submitRoute]);

  const handleSubmitManual = useCallback(() => {
    if (!timerExpiredRef.current) {
      timerExpiredRef.current = true;
      submitRoute(route);
    }
  }, [route, submitRoute]);

  //  execution step 
  const handleNextStep = useCallback(() => {
    if (!result) return;
    if (execStep + 1 >= result.steps.length) {
      setPhase(PHASE.RESULT);
    } else {
      setExecStep(s => s + 1);
    }
  }, [execStep, result]);

  // new game 
  const handleNewGame = useCallback(() => {
    setPhase(PHASE.SETUP);
    setSegments(null);
    setGameSetup(null);
    setRoute([]);
    setResult(null);
    setExecStep(0);
    setError('');
  }, []);

  if (!network) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="warning" />
        <p className="mt-3 text-secondary">Loading network…</p>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      {/*  SETUP  */}
      {phase === PHASE.SETUP && (
        <SetupPhase
          network={network}
          onReady={handleStartPlanning}
          loading={loading}
        />
      )}

      {/*  planning  */}
      {phase === PHASE.PLANNING && gameSetup && segments && (
        <PlanningPhase
          network={network}
          segments={segments}
          gameSetup={gameSetup}
          route={route}
          onAddSegment={addSegment}
          onRemoveLast={removeLastStation}
          onSubmit={handleSubmitManual}
          onTimerExpire={handleTimerExpire}
          loading={loading}
        />
      )}

      {/*  execution  */}
      {phase === PHASE.EXECUTION && result && (
        <ExecutionPhase
          network={network}
          result={result}
          execStep={execStep}
          route={route}
          gameSetup={gameSetup}
          onNext={handleNextStep}
        />
      )}

      {/*  result  */}
      {phase === PHASE.RESULT && result && (
        <ResultPhase
          result={result}
          onNewGame={handleNewGame}
        />
      )}
    </Container>
  );
}

//  Setup Phase 
function SetupPhase({ network, onReady, loading }) {
  return (
    <div>
      <h3 className="mb-3" style={{ color: '#d64316' }}>🗺️ Phase 1 : Study the Network</h3>
      <p className="text-secondary mb-4">
        Take your time to memorize the map. When you're ready, start the game the map will disappear and you'll have <strong>90 seconds</strong> to plan your route!
      </p>
      <Card className="p-3 mb-4">
        <NetworkMap network={network} showLines={true} />
      </Card>
      <div className="text-center">
        <Button className="btn-metro px-5 py-2" size="lg" onClick={onReady} disabled={loading}>
          {loading ? 'Starting…' : "Start Game!"}
        </Button>
      </div>
    </div>
  );
}

//  Planning Phase 
function PlanningPhase({ network, segments, gameSetup, route, onAddSegment, onRemoveLast, onSubmit, onTimerExpire, loading }) {
  const { startStation, endStation } = gameSetup;

  const stationById = Object.fromEntries((network?.stations || []).map(s => [s.id, s]));
  const lastId = route[route.length - 1];

  // Which segments are in the current route
  const routeSegSet = new Set();
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i], b = route[i + 1];
    routeSegSet.add(`${Math.min(a, b)}-${Math.max(a, b)}`);
  }

  return (
    <div>
      <h3 className="mb-2" style={{ color: '#d64316' }}>🧠 Phase 2 : Plan Your Route</h3>
      <Row className="mb-3 align-items-center">
        <Col>
          <Badge bg="success" className="me-2">FROM: {startStation.name}</Badge>
          <Badge bg="danger">TO: {endStation.name}</Badge>
        </Col>
        <Col md="auto">
          <span className="coin-badge">🪙 20</span>
        </Col>
      </Row>

      <Timer totalSeconds={90} onExpire={onTimerExpire} />

      <Row className="mt-3 g-3">
        {/* Map (no lines) */}
        <Col md={6}>
          <Card className="p-2">
            <small className="text-secondary mb-2 d-block">Map </small>
            <NetworkMap network={network} showLines={false} highlightRoute={route} />
          </Card>
        </Col>

        {/* Segment list + route builder */}
        <Col md={6}>
          <Card className="p-3">
            <h6 style={{ color: '#d64316' }}>Segments : click to add to route</h6>
            <div className="segment-list mb-3">
              {segments.map((seg, i) => {
                const key = `${Math.min(seg.station_a_id, seg.station_b_id)}-${Math.max(seg.station_a_id, seg.station_b_id)}`;
                const inRoute = routeSegSet.has(key);
                const connectsToLast = seg.station_a_id === lastId || seg.station_b_id === lastId;
                return (
                  <div
                    key={i}
                    className={`segment-item ${inRoute ? 'in-route' : connectsToLast ? 'selected' : ''}`}
                    onClick={() => onAddSegment(seg.station_a_id, seg.station_b_id)}
                  >
                    {seg.station_a_name} — {seg.station_b_name}
                    {inRoute && <Badge bg="success" className="ms-2">✓</Badge>}
                  </div>
                );
              })}
            </div>

            <div className="mb-3">
              <h6 style={{ color: '#d64316' }}>Your Route</h6>
              <div className="small" style={{ color: '#94a3b8', lineHeight: 1.8 }}>
                {route.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ' → '}
                    <span style={{ color: id === startStation.id ? '#2a9d8f' : id === endStation.id ? '#e63946' : '#686868' }}>
                      {stationById[id]?.name || id}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div className="d-flex gap-2">
              <Button size="sm" variant="outline-secondary" onClick={onRemoveLast} disabled={route.length <= 1}>
                ← Undo
              </Button>
              <Button className="btn-metro flex-grow-1" onClick={onSubmit} disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Route'}
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

//  execution Phase 
function ExecutionPhase({ network, result, execStep, route, gameSetup, onNext }) {
  const step = result.steps[execStep];
  const stationById = Object.fromEntries((network?.stations || []).map(s => [s.id, s]));
  const isLast = execStep + 1 >= result.steps.length;

  const effectColor = step.event.effect > 0 ? '#2a9d8f' : step.event.effect < 0 ? '#e63946' : '#94a3b8';
  const routeSoFar = route.slice(0, execStep + 2);

  return (
    <div>
      <h3 className="mb-3" style={{ color: '#f4a261' }}>⚡ Phase 3 : Execution</h3>

      <Row className="g-3">
        <Col md={6}>
          <Card className="p-2">
            <NetworkMap network={network} showLines={true} highlightRoute={routeSoFar} />
          </Card>
        </Col>
        <Col md={6}>
          <Card className="p-4 text-center" style={{ minHeight: 260 }}>
            <div className="mb-2 text-secondary small">
              Step {execStep + 1} / {result.steps.length}
            </div>
            <div className="mb-3" style={{ fontSize: '1.1rem' }}>
              <span style={{ color: '#2a9d8f' }}>{stationById[step.fromStationId]?.name}</span>
              {' → '}
              <span style={{ color: '#e63946' }}>{stationById[step.toStationId]?.name}</span>
            </div>
            <div
              className="p-3 rounded mb-3"
              style={{ background: '#b6bac2', fontSize: '1rem', lineHeight: 1.6 }}
            >
              🎲 <em>{step.event.description}</em>
            </div>
            <div style={{ fontSize: '1.2rem', color: effectColor, fontWeight: 700 }}>
              {step.event.effect > 0 ? '+' : ''}{step.event.effect} coins
            </div>
            <div className="mt-2 coin-badge">
              🪙 {step.coinsAfter} coins remaining
            </div>
            <Button className="btn-metro mt-4" onClick={onNext}>
              {isLast ? 'See Final Result' : 'Next Step →'}
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

//  result Phase 
function ResultPhase({ result, onNewGame }) {
  const stars = result.score >= 20 ? '🌟🌟🌟' : result.score >= 12 ? '⭐⭐' : result.score >= 5 ? '⭐' : '💀';

  return (
    <Container className="py-4 d-flex justify-content-center">
      <Card className="p-5 text-center" style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ fontSize: '4rem' }}>{stars}</div>
        <h3 className="mt-3" style={{ color: '#f4a261' }}>
          {result.valid ? 'Journey Complete!' : 'Invalid Route!'}
        </h3>

        {!result.valid && (
          <Alert variant="danger" className="mt-3">
            Your route was invalid or incomplete. You lose all 20 coins.
          </Alert>
        )}

        <div className="my-4">
          <div className="text-secondary small">Final Score</div>
          <div className="coin-badge" style={{ fontSize: '3rem' }}>🪙 {result.score}</div>
          <div className="text-secondary small">coins</div>
        </div>

        <Button className="btn-metro px-4 py-2" size="lg" onClick={onNewGame}>
          Play Again
        </Button>
      </Card>
    </Container>
  );
}


export {GamePage} 