import { useMemo, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { useHabits } from "@/contexts/HabitContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toLocalDateStr } from "@/lib/dateUtils";
import * as THREE from "three";

function WaterGlass({ fillPercent }: { fillPercent: number }) {
  const fill = Math.max(0, Math.min(1, fillPercent));
  const segments = 64;

  // Glass dimensions
  const glassHeight = 3.2;
  const glassRadius = 1.1;
  const glassThickness = 0.06;
  const bottomThickness = 0.12;

  // Water dimensions
  const waterMaxHeight = glassHeight - bottomThickness - 0.1;
  const waterHeight = Math.max(0.01, fill * waterMaxHeight);
  const waterY = bottomThickness / 2 + waterHeight / 2;

  // Glass material - transparent with refraction look
  const glassMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0.85, 0.92, 0.95),
    transparent: true,
    opacity: 0.18,
    roughness: 0.05,
    metalness: 0.0,
    transmission: 0.92,
    thickness: 0.5,
    ior: 1.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  }), []);

  // Water material
  const waterMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("hsl(200, 85%, 55%)"),
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    metalness: 0.0,
    transmission: 0.3,
    thickness: 1.0,
    ior: 1.33,
  }), []);

  // Water surface top
  const surfaceMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("hsl(200, 80%, 65%)"),
    transparent: true,
    opacity: 0.5,
    roughness: 0.0,
    metalness: 0.1,
  }), []);

  return (
    <group position={[0, 0, 0]}>
      {/* Glass outer wall */}
      <mesh>
        <cylinderGeometry args={[glassRadius, glassRadius * 0.85, glassHeight, segments, 1, true]} />
        <primitive object={glassMat} attach="material" />
      </mesh>

      {/* Glass inner wall */}
      <mesh>
        <cylinderGeometry args={[glassRadius - glassThickness, glassRadius * 0.85 - glassThickness, glassHeight, segments, 1, true]} />
        <primitive object={glassMat} attach="material" />
      </mesh>

      {/* Glass bottom */}
      <mesh position={[0, -glassHeight / 2 + bottomThickness / 2, 0]}>
        <cylinderGeometry args={[glassRadius * 0.85, glassRadius * 0.85, bottomThickness, segments]} />
        <primitive object={glassMat} attach="material" />
      </mesh>


      {/* Water body */}
      {fill > 0.001 && (
        <mesh position={[0, -glassHeight / 2 + waterY, 0]}>
          <cylinderGeometry args={[
            glassRadius - glassThickness - 0.02,
            glassRadius * 0.85 - glassThickness - 0.02,
            waterHeight,
            segments
          ]} />
          <primitive object={waterMat} attach="material" />
        </mesh>
      )}

      {/* Water surface disc */}
      {fill > 0.001 && (
        <mesh
          position={[0, -glassHeight / 2 + waterY + waterHeight / 2, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[glassRadius - glassThickness - 0.02, segments]} />
          <primitive object={surfaceMat} attach="material" />
        </mesh>
      )}

    </group>
  );
}

function computeGlassFill(
  completions: Set<string>,
  activeDays: number[],
  createdAt: string
): number {
  const today = new Date();
  const start = new Date(createdAt);
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  let fill = 0;
  let consecutiveMisses = 0;
  const d = new Date(start);

  while (d <= today) {
    const dow = d.getDay();
    if (activeDays.includes(dow)) {
      const dateStr = toLocalDateStr(d);
      if (completions.has(dateStr)) {
        // Completed: add 1, reset miss streak
        fill += 1;
        consecutiveMisses = 0;
      } else {
        consecutiveMisses++;
        // Penalty: (consecutiveMisses - 1)^2
        // 1 miss = 0 penalty, 2 = 1, 3 = 4, etc.
        if (consecutiveMisses >= 2) {
          const penalty = Math.pow(consecutiveMisses - 1, 2);
          // But we only subtract the incremental penalty for THIS day
          // Total after n misses = sum of penalties = not quite right
          // Actually: on each miss day, we apply the NEW total penalty
          // Simpler: on miss streak end or each miss, apply formula
          // Let's recalculate: penalty for the whole streak is (n-1)^2
          // Previous streak penalty was (n-2)^2 (if n>=3) or 0 (if n==2)
          // Incremental = (n-1)^2 - (n-2)^2 = 2n - 3
          const prevPenalty = consecutiveMisses >= 3 ? Math.pow(consecutiveMisses - 2, 2) : 0;
          const incrementalPenalty = Math.pow(consecutiveMisses - 1, 2) - prevPenalty;
          fill = Math.max(0, fill - incrementalPenalty);
        }
        // 1 miss = no penalty
      }
    }
    d.setDate(d.getDate() + 1);
  }

  return Math.max(0, fill);
}

export default function Visualize() {
  const { habits } = useHabits();
  const { user } = useAuth();
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);
  const [completions, setCompletions] = useState<Set<string>>(new Set());

  const activeHabit = selectedHabit ? habits.find(h => h.id === selectedHabit) : habits[0];

  // Fetch all completions for the active habit
  useEffect(() => {
    if (!activeHabit || !user) { setCompletions(new Set()); return; }
    (async () => {
      const { data } = await supabase
        .from("habit_completions")
        .select("completed_date")
        .eq("habit_id", activeHabit.id)
        .eq("user_id", user.id);
      setCompletions(new Set((data ?? []).map((c: any) => c.completed_date)));
    })();
  }, [activeHabit?.id, user]);

  const naturalFill = useMemo(() => {
    if (!activeHabit) return 0;
    return computeGlassFill(
      completions,
      activeHabit.activeDays,
      activeHabit.createdAt
    );
  }, [activeHabit, completions]);

  // Calculate the total active days in a year for this habit's schedule
  const totalActiveDaysPerYear = useMemo(() => {
    if (!activeHabit) return 365;
    const activeDayCount = activeHabit.activeDays.length;
    // Each week has activeDayCount active days, ~52.14 weeks/year
    return Math.round((365 / 7) * activeDayCount);
  }, [activeHabit]);

  const fillPercent = Math.min(1, naturalFill / totalActiveDaysPerYear);
  const displayPercent = Math.round(fillPercent * 100);
  const dayLabel = `${Math.round(naturalFill)} days filled`;

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-md mx-auto w-full">
        <div className="shrink-0 px-5 pt-6 pb-2">
          <h1 className="text-xl font-display text-foreground">Visualize Growth</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your consistency, filling up over time.
          </p>
        </div>

        {habits.length > 1 && (
          <div className="px-5 pb-2 flex gap-2 overflow-x-auto">
            {habits.map(h => (
              <button
                key={h.id}
                onClick={() => { setSelectedHabit(h.id); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  (selectedHabit === h.id || (!selectedHabit && h.id === habits[0]?.id))
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {h.name}
              </button>
            ))}
          </div>
        )}

        <div className="h-[45vh] relative">
          <Canvas camera={{ position: [0, 0.5, 7], fov: 40 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 8, 5]} intensity={1.0} />
            <directionalLight position={[-3, 4, -3]} intensity={0.4} />
            <pointLight position={[0, -2, 3]} intensity={0.3} color="hsl(200, 80%, 70%)" />
            <WaterGlass fillPercent={fillPercent} />
            <OrbitControls
              enablePan={false}
              enableZoom={true}
              maxPolarAngle={Math.PI / 1.8}
              minDistance={3}
              maxDistance={10}
            />
          </Canvas>
        </div>

        {/* Info & slider below canvas */}
        <div className="px-5 pb-24 space-y-3">
          <div className="flex justify-center">
            <div className="bg-card/90 backdrop-blur-sm border border-border rounded-2xl px-5 py-3 text-center">
              <p className="text-lg font-display text-foreground">{dayLabel}</p>
              <p className="text-xs text-muted-foreground">{displayPercent}% full · {activeHabit?.name || "Select a habit"}</p>
            </div>
          </div>
          <div className="bg-card/90 backdrop-blur-sm border border-border rounded-2xl px-4 py-3 space-y-1.5">
            <p className="text-xs font-medium text-foreground">How does this work?</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Each day you complete fills the glass by one unit. It reaches full at <span className="text-foreground font-medium">{totalActiveDaysPerYear} active days</span> (based on your schedule). Missing a single day is forgiven — nothing happens. But miss <span className="text-foreground font-medium">2 days in a row</span> and the glass starts draining. The longer your miss streak, the <span className="text-foreground font-medium">faster it drains</span> — consecutive misses compound the loss. Stay consistent! 🥛
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
