import { useState, useEffect } from "react";

const COLORS = [
  "var(--molecule-1)",
  "var(--molecule-2)",
  "var(--molecule-3)",
  "var(--molecule-4)",
  "var(--molecule-5)",
];

type DrawFn = (color: string) => React.ReactNode;

const ester: DrawFn = (c) => (
  <>
    <line x1={-6} y1={0} x2={0} y2={0} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={0} x2={8} y2={-5} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={0} x2={8} y2={5} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <circle cx={-10} cy={0} r={1.4} fill={c} />
    <circle cx={12} cy={-5} r={1.2} fill={c} />
    <circle cx={12} cy={5} r={1.2} fill={c} />
  </>
);

const alcohol: DrawFn = (c) => (
  <>
    <line x1={-8} y1={0} x2={0} y2={0} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={0} x2={6} y2={-5} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={6} y1={-5} x2={10} y2={-9} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <circle cx={-12} cy={0} r={1.4} fill={c} />
    <circle cx={0} cy={0} r={1.4} fill={c} />
    <circle cx={10} cy={-9} r={1.2} fill={c} />
  </>
);

const triglyceride: DrawFn = (c) => (
  <>
    <line x1={0} y1={0} x2={0} y2={-8} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={0} x2={-4} y2={6} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={0} x2={5} y2={5} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={-8} x2={-8} y2={-12} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={-4} y1={6} x2={-10} y2={10} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={5} y1={5} x2={12} y2={8} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <circle cx={0} cy={0} r={1.6} fill={c} />
    <circle cx={0} cy={-8} r={1.2} fill={c} />
    <circle cx={-4} cy={6} r={1.2} fill={c} />
    <circle cx={5} cy={5} r={1.2} fill={c} />
    <circle cx={-8} cy={-12} r={1.2} fill={c} />
    <circle cx={-10} cy={10} r={1.2} fill={c} />
    <circle cx={12} cy={8} r={1.2} fill={c} />
  </>
);

const fattyAcid: DrawFn = (c) => (
  <>
    <line x1={-8} y1={0} x2={0} y2={0} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={0} x2={6} y2={0} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={6} y1={0} x2={10} y2={-4} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={6} y1={0} x2={10} y2={4} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <circle cx={-12} cy={0} r={1.4} fill={c} />
    <circle cx={0} cy={0} r={1.4} fill={c} />
    <circle cx={10} cy={-4} r={1.2} fill={c} />
    <circle cx={10} cy={4} r={1.2} fill={c} />
  </>
);

const methylEster: DrawFn = (c) => (
  <>
    <line x1={-5} y1={0} x2={0} y2={0} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={0} x2={5} y2={-5} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={0} x2={5} y2={5} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={5} y1={5} x2={11} y2={7} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <circle cx={-9} cy={0} r={1.4} fill={c} />
    <circle cx={9} cy={-5} r={1.2} fill={c} />
    <circle cx={11} cy={7} r={1.2} fill={c} />
  </>
);

const glycerol: DrawFn = (c) => (
  <>
    <line x1={-7} y1={5} x2={0} y2={0} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={0} x2={7} y2={5} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={0} x2={0} y2={-7} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <circle cx={-7} cy={5} r={1.2} fill={c} />
    <circle cx={0} cy={0} r={1.4} fill={c} />
    <circle cx={7} cy={5} r={1.2} fill={c} />
    <circle cx={0} cy={-7} r={1.2} fill={c} />
  </>
);

const diglyceride: DrawFn = (c) => (
  <>
    <line x1={0} y1={0} x2={0} y2={-8} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={0} x2={5} y2={5} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={0} x2={-4} y2={6} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={-8} x2={-7} y2={-13} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={5} y1={5} x2={12} y2={8} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <circle cx={0} cy={0} r={1.6} fill={c} />
    <circle cx={0} cy={-8} r={1.2} fill={c} />
    <circle cx={5} cy={5} r={1.2} fill={c} />
    <circle cx={-4} cy={6} r={1.2} fill={c} />
    <circle cx={-7} cy={-13} r={1.2} fill={c} />
    <circle cx={12} cy={8} r={1.2} fill={c} />
  </>
);

const ethylEster: DrawFn = (c) => (
  <>
    <line x1={-5} y1={0} x2={0} y2={0} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={0} x2={5} y2={-5} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={0} x2={5} y2={5} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={5} y1={5} x2={12} y2={6} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={12} y1={6} x2={18} y2={10} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <circle cx={-9} cy={0} r={1.4} fill={c} />
    <circle cx={9} cy={-5} r={1.2} fill={c} />
    <circle cx={12} cy={6} r={1.2} fill={c} />
    <circle cx={18} cy={10} r={1.2} fill={c} />
  </>
);

const water: DrawFn = (c) => (
  <>
    <line x1={0} y1={-3} x2={-4} y2={4} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <line x1={0} y1={-3} x2={4} y2={4} stroke={c} strokeWidth={0.6} strokeLinecap="round" />
    <circle cx={0} cy={-3} r={1.6} fill={c} />
    <circle cx={-4} cy={4} r={1.1} fill={c} />
    <circle cx={4} cy={4} r={1.1} fill={c} />
  </>
);

const MOLECULES: { draw: DrawFn }[] = [
  { draw: ester },
  { draw: alcohol },
  { draw: triglyceride },
  { draw: fattyAcid },
  { draw: methylEster },
  { draw: glycerol },
  { draw: diglyceride },
  { draw: ethylEster },
  { draw: water },
];

type Instance = {
  x: number;
  y: number;
  color: string;
  delay: number;
  molIndex: number;
  scale: number;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

const NUM_INSTANCES = 12;

export default function MoleculeBackground() {
  const [instances, setInstances] = useState<Instance[]>([]);

  useEffect(() => {
    const result: Instance[] = [];
    for (let i = 0; i < NUM_INSTANCES; i++) {
      result.push({
        x: rand(5, 95),
        y: rand(5, 95),
        color: COLORS[i % COLORS.length],
        delay: rand(0, 8),
        molIndex: i % MOLECULES.length,
        scale: rand(0.18, 0.35),
      });
    }
    setInstances(result);
  }, []);

  if (instances.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        {instances.map((inst, i) => {
          const dur = 50 + inst.delay * 6;
          return (
            <g
              key={i}
              transform={`translate(${inst.x}, ${inst.y}) scale(${inst.scale})`}
            >
              <g>
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0,0; 1.8,-2.5; -1.2,1.8; 2.5,1.2; 0,0"
                  dur={`${dur}s`}
                  begin={`${inst.delay}s`}
                  repeatCount="indefinite"
                />
                {MOLECULES[inst.molIndex].draw(inst.color)}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
