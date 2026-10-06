'use client';

import React, { useEffect, useRef } from 'react';
import { JarvisVoiceState } from '@/hooks/use-jarvis-live';
import { VoicePersona } from '@/lib/edc-os-config';

interface JarvisHologramCoreProps {
  voiceState: JarvisVoiceState;
  isDuplexActive: boolean;
  isMuted: boolean;
  inputLevel: number;
  outputLevel: number;
  vadSensitivity: number;
  persona: VoicePersona;
  bargeInCount: number;
  lastLatencyMs: number;
  onCoreClick: () => void;
}

export function JarvisHologramCore({
  voiceState,
  isDuplexActive,
  isMuted,
  inputLevel,
  outputLevel,
  vadSensitivity,
  persona,
  bargeInCount,
  lastLatencyMs,
  onCoreClick,
}: JarvisHologramCoreProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    voiceState,
    isDuplexActive,
    isMuted,
    inputLevel,
    outputLevel,
    vadSensitivity,
  });

  useEffect(() => {
    stateRef.current = {
      voiceState,
      isDuplexActive,
      isMuted,
      inputLevel,
      outputLevel,
      vadSensitivity,
    };
  }, [voiceState, isDuplexActive, isMuted, inputLevel, outputLevel, vadSensitivity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;
    let ringAngle1 = 0;
    let ringAngle2 = 0;
    let ringAngle3 = 0;
    let smoothedEnergy = 0;

    const render = () => {
      const {
        voiceState: st,
        isDuplexActive: active,
        isMuted: muted,
        inputLevel: inLvl,
        outputLevel: outLvl,
        vadSensitivity: vadSens,
      } = stateRef.current;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }
      const targetW = Math.max(1, Math.round(rect.width * dpr));
      const targetH = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.min(w, h) * 0.44;

      ctx.clearRect(0, 0, w, h);

      // Determine active energy and color scheme
      const targetEnergy =
        st === 'jarvis_speaking'
          ? Math.max(0.18, outLvl * 1.35)
          : st === 'user_speaking'
          ? Math.max(0.2, inLvl * 1.4)
          : st === 'thinking'
          ? 0.35 + Math.sin(phase * 4) * 0.12
          : active && !muted
          ? Math.max(0.06, inLvl * 0.8)
          : 0.04;

      smoothedEnergy += (targetEnergy - smoothedEnergy) * 0.18;

      const speedMult =
        st === 'thinking'
          ? 2.8
          : st === 'jarvis_speaking'
          ? 1.6 + smoothedEnergy * 1.5
          : st === 'user_speaking'
          ? 1.8 + smoothedEnergy * 1.4
          : active
          ? 0.9
          : 0.35;

      phase += 0.025 * speedMult;
      ringAngle1 += 0.006 * speedMult;
      ringAngle2 -= 0.009 * speedMult;
      ringAngle3 += 0.014 * speedMult;

      // Color definitions (RGB strings)
      // Jarvis speaking -> Warm Stark Amber/Gold (#F59E0B) with Cyan Barge-In outer ring
      // User speaking -> Electric Arc Cyan + Emerald (#38BDF8 / #10B981)
      // Thinking -> Amber + Cyan synthesis
      // Listening -> Crisp Arc Cyan (#38BDF8)
      // Standby -> Slate Cyan (#0284C7)
      let primaryRgb = '56, 189, 248'; // #38BDF8 sky-400
      let secondaryRgb = '14, 165, 233'; // #0EA5E9 sky-500
      let coreGlowRgb = '56, 189, 248';

      if (st === 'jarvis_speaking') {
        primaryRgb = '245, 158, 11'; // #F59E0B amber-500
        secondaryRgb = '251, 191, 36'; // #FBBF24 amber-400
        coreGlowRgb = '245, 158, 11';
      } else if (st === 'user_speaking') {
        primaryRgb = '16, 185, 129'; // #10B981 emerald-500
        secondaryRgb = '56, 189, 248'; // #38BDF8 sky-400
        coreGlowRgb = '16, 185, 129';
      } else if (st === 'thinking') {
        primaryRgb = '251, 191, 36';
        secondaryRgb = '56, 189, 248';
        coreGlowRgb = '245, 158, 11';
      } else if (!active) {
        primaryRgb = '100, 116, 139';
        secondaryRgb = '56, 189, 248';
        coreGlowRgb = '56, 189, 248';
      }

      // 1. Ambient Radial Core Field
      const ambientGrad = ctx.createRadialGradient(
        cx,
        cy,
        maxR * 0.05,
        cx,
        cy,
        maxR * 1.08
      );
      ambientGrad.addColorStop(0, `rgba(${coreGlowRgb}, ${0.22 + smoothedEnergy * 0.28})`);
      ambientGrad.addColorStop(0.5, `rgba(${primaryRgb}, ${0.07 + smoothedEnergy * 0.1})`);
      ambientGrad.addColorStop(1, 'rgba(6, 9, 17, 0)');
      ctx.fillStyle = ambientGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * 1.08, 0, Math.PI * 2);
      ctx.fill();

      // 2. Outer Azimuthal Telemetry Ring & Degree Ticks (Barge-In Shield Ring)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ringAngle1 * 0.5);
      const outerR = maxR * 0.96;
      const tickCount = 72;
      for (let i = 0; i < tickCount; i++) {
        const angle = (i / tickCount) * Math.PI * 2;
        const isMajor = i % 6 === 0;
        const len = isMajor ? 8 : 4;
        const x1 = Math.cos(angle) * (outerR - len);
        const y1 = Math.sin(angle) * (outerR - len);
        const x2 = Math.cos(angle) * outerR;
        const y2 = Math.sin(angle) * outerR;
        ctx.strokeStyle =
          st === 'jarvis_speaking'
            ? `rgba(56, 189, 248, ${isMajor ? 0.55 : 0.22})` // Cyan outer ring shows Barge-In is armed while JARVIS speaks!
            : `rgba(${primaryRgb}, ${isMajor ? 0.5 : 0.2})`;
        ctx.lineWidth = isMajor ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();

      // 3. Segmented Gimbal Arcs (Counter-Rotating Stark HUD Rings)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ringAngle2);
      const gimbalR = maxR * 0.84;
      ctx.strokeStyle = `rgba(${primaryRgb}, 0.45)`;
      ctx.lineWidth = 2;
      const segments = [
        [0, 0.9],
        [1.3, 2.4],
        [2.9, 4.1],
        [4.6, 5.7],
      ];
      for (const [start, end] of segments) {
        ctx.beginPath();
        ctx.arc(0, 0, gimbalR, start, end);
        ctx.stroke();
      }
      ctx.restore();

      // 4. VAD Sensitivity Gate Threshold Ring
      const vadRingR = maxR * (0.58 + (1 - vadSens) * 0.14);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.setLineDash([4, 6]);
      ctx.strokeStyle = active
        ? 'rgba(56, 189, 248, 0.32)'
        : 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, vadRingR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 5. Radial 64-Band Harmonic Frequency Analyzer
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ringAngle3 * 0.3);
      const barCount = 64;
      const baseBarR = maxR * 0.52;
      for (let i = 0; i < barCount; i++) {
        const angle = (i / barCount) * Math.PI * 2;
        const wave1 = Math.sin(angle * 6 + phase * 2.2) * 0.5 + 0.5;
        const wave2 = Math.cos(angle * 11 - phase * 3.1) * 0.5 + 0.5;
        const barAmplitude =
          4 +
          smoothedEnergy * maxR * 0.28 * (0.35 + 0.65 * wave1 * wave2);

        const x1 = Math.cos(angle) * baseBarR;
        const y1 = Math.sin(angle) * baseBarR;
        const x2 = Math.cos(angle) * (baseBarR + barAmplitude);
        const y2 = Math.sin(angle) * (baseBarR + barAmplitude);

        ctx.strokeStyle =
          i % 2 === 0
            ? `rgba(${primaryRgb}, ${0.45 + smoothedEnergy * 0.5})`
            : `rgba(${secondaryRgb}, ${0.35 + smoothedEnergy * 0.45})`;
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
      ctx.restore();

      // 6. Inner Harmonic Wave Interference Loop (Organic Voice Filament)
      ctx.save();
      ctx.translate(cx, cy);
      const waveR = maxR * 0.36;
      for (let layer = 0; layer < 2; layer++) {
        ctx.beginPath();
        const pts = 96;
        for (let i = 0; i <= pts; i++) {
          const theta = (i / pts) * Math.PI * 2;
          const mod =
            Math.sin(theta * (4 + layer * 3) + phase * (layer === 0 ? 2.5 : -2.1)) *
            (3 + smoothedEnergy * maxR * 0.14);
          const r = waveR + mod;
          const x = Math.cos(theta) * r;
          const y = Math.sin(theta) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle =
          layer === 0
            ? `rgba(${primaryRgb}, ${0.65 + smoothedEnergy * 0.35})`
            : `rgba(${secondaryRgb}, 0.4)`;
        ctx.lineWidth = layer === 0 ? 2 : 1.25;
        ctx.stroke();
      }
      ctx.restore();

      // 7. Central Arc Nucleus
      const nucleusR = maxR * (0.18 + smoothedEnergy * 0.06);
      const coreGrad = ctx.createRadialGradient(
        cx,
        cy,
        nucleusR * 0.1,
        cx,
        cy,
        nucleusR
      );
      coreGrad.addColorStop(0, `rgba(255, 255, 255, ${0.85 + smoothedEnergy * 0.15})`);
      coreGrad.addColorStop(0.45, `rgba(${primaryRgb}, 0.85)`);
      coreGrad.addColorStop(1, `rgba(${primaryRgb}, 0.08)`);

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, nucleusR, 0, Math.PI * 2);
      ctx.fill();

      // Inner precision reticle crosshairs
      ctx.strokeStyle = `rgba(255, 255, 255, 0.35)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, nucleusR * 1.18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const stateLabel =
    voiceState === 'jarvis_speaking'
      ? `${persona.codename} Speaking · Barge-In Armed`
      : voiceState === 'user_speaking'
      ? 'Acoustic VAD Locked · Receiving Voice'
      : voiceState === 'thinking'
      ? 'Executing Neural Strategy & Tool Graph'
      : voiceState === 'connecting'
      ? 'Calibrating Gemini 3.8 Live Duplex Link'
      : isDuplexActive
      ? isMuted
        ? 'Duplex Link Active · Mic Muted'
        : 'Full-Duplex Listening · True VAD Ready'
      : 'Standby · Tap Core to Engage Live Duplex';

  const dbInput =
    isDuplexActive && !isMuted
      ? Math.round(-58 + inputLevel * 54)
      : -60;
  const dbOutput =
    voiceState === 'jarvis_speaking'
      ? Math.round(-48 + outputLevel * 46)
      : -60;

  return (
    <div className="relative flex flex-col items-center justify-center select-none">
      {/* Top Telemetry Readout Row (Clean unboxed metadata per design rules) */}
      <div className="w-full flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums mb-2 px-1">
        <span>ENGINE: GEMINI-3.8-LIVE</span>
        <span aria-hidden="true">·</span>
        <span>VOICE: {persona.id.toUpperCase()}</span>
        <span aria-hidden="true">·</span>
        <span>BARGE-INS: {bargeInCount}</span>
      </div>

      {/* Interactive Holographic Core Canvas Button */}
      <button
        type="button"
        onClick={onCoreClick}
        aria-label={
          isDuplexActive
            ? voiceState === 'jarvis_speaking'
              ? 'Interrupt JARVIS immediately (Barge-In)'
              : 'Stop Full-Duplex Voice Link'
            : 'Start Full-Duplex Voice Conversation'
        }
        className="group relative w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 transition-transform duration-150 active:scale-[0.98] cursor-pointer"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full pointer-events-none"
        />

        {/* Subtle corner HUD coordinate ticks */}
        <div className="pointer-events-none absolute inset-2 border border-sky-500/10 rounded-full group-hover:border-sky-400/25 transition-colors duration-150" />
      </button>

      {/* Live Status & Acoustic dB Telemetry */}
      <div className="mt-2 text-center space-y-1">
        <p
          className={`text-sm font-medium tracking-wide ${
            voiceState === 'jarvis_speaking'
              ? 'text-amber-300'
              : voiceState === 'user_speaking'
              ? 'text-emerald-300'
              : isDuplexActive
              ? 'text-sky-300'
              : 'text-slate-300'
          }`}
        >
          {stateLabel}
        </p>
        <div className="flex items-center justify-center gap-3 text-xs text-slate-400 font-mono tabular-nums">
          <span>MIC: {dbInput} dB</span>
          <span aria-hidden="true">·</span>
          <span>OUT: {dbOutput} dB</span>
          <span aria-hidden="true">·</span>
          <span className="text-emerald-400">SPEED: {lastLatencyMs}ms</span>
        </div>
      </div>
    </div>
  );
}
