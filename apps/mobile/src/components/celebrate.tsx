import { type PropsWithChildren, useEffect } from 'react';
import { Platform, type StyleProp, StyleSheet, TextInput, type TextStyle, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  ReduceMotion,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { GText, Icon, type Palette } from '@/components/gamify-ui';
import { duration, ease, enterUp, haptic, spring } from '@/components/motion';

// Pieces for the rare-tier wins (finishing a step, a level). Overshoot is allowed here and nowhere else.

// `enterUp` at an absolute time (ms from mount) on a choreographed screen.
export function enterAt(ms: number, reduced: boolean) {
  return enterUp(0, reduced).delay(ms);
}

export type Entrance = ReturnType<typeof enterAt>;

// The check is drawn in a 60pt box. CHECK_LENGTH is a little over the path's ~50pt, and it starts 4pt further back,
// so the round cap doesn't show as a dot before the stroke begins.
const CHECK = 'M13.5 31.5L25 43L46.5 17';
const CHECK_LENGTH = 51;
const CHECK_HIDDEN = CHECK_LENGTH + 4;
const SPARKLE = 'M6 0C6.6 3.6 8.4 5.4 12 6C8.4 6.6 6.6 8.4 6 12C5.4 8.4 3.6 6.6 0 6C3.6 5.4 5.4 3.6 6 0Z';
const PARTICLES = Array.from({ length: 12 }, (_, index) => index);

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

// The step-complete check: the green circle pops in with the success haptic, a halo ring ripples out, 12 particles
// burst from behind it and the check mark draws itself. Plays once on mount. Reduced motion fades the circle in with
// the check already drawn.
export function CelebrationCheck({ p, size = 122 }: { p: Palette; size?: number }) {
  const reduced = useReducedMotion();
  const draws = !reduced && Platform.OS !== 'web';
  const pop = useSharedValue(reduced ? 1 : 0.5);
  const shown = useSharedValue(0);
  const draw = useSharedValue(0);
  const halo = useSharedValue(0);
  const travel = useSharedValue(0);
  const fade = useSharedValue(0);

  useEffect(() => {
    shown.set(withTiming(1, { duration: reduced ? duration.state : 120, easing: ease.out, reduceMotion: ReduceMotion.Never }));
    if (reduced) return;
    pop.set(withSpring(1, spring.pop));
    halo.set(withDelay(80, withTiming(1, { duration: 650, easing: ease.out })));
    draw.set(withDelay(120, withTiming(1, { duration: 260, easing: ease.out })));
    travel.set(withDelay(60, withTiming(1, { duration: 700, easing: ease.out })));
    // Linear so the particles hang at the edge of the burst as they fade, instead of vanishing with the fast travel.
    fade.set(withDelay(60, withTiming(1, { duration: 700, easing: Easing.linear })));
  }, [reduced, pop, shown, draw, halo, travel, fade]);

  // Mount only: the one haptic for this screen, in the frame the circle starts to pop.
  useEffect(() => {
    haptic.success();
  }, []);

  const circleStyle = useAnimatedStyle(() => ({ opacity: shown.get(), transform: [{ scale: pop.get() }] }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(halo.get(), [0, 0.01, 1], [0, 0.45, 0], Extrapolation.CLAMP),
    transform: [{ scale: 1 + 0.7 * halo.get() }],
  }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_HIDDEN * (1 - draw.get()) }));
  const colors = [p.streak, p.accent, p.primary, p.success, p.og];
  const mark = size * (60 / 122);

  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      {reduced ? null : (
        <View style={[StyleSheet.absoluteFill, styles.passThrough]}>
          <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 5, borderColor: p.success }, haloStyle]} />
          {PARTICLES.map((index) => (
            <Particle key={index} index={index} color={colors[index % colors.length]} center={size / 2} travel={travel} fade={fade} />
          ))}
        </View>
      )}
      <Animated.View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: p.success, shadowColor: p.success }, circleStyle]}>
        <Svg width={mark} height={mark} viewBox="0 0 60 60">
          {draws ? (
            <AnimatedPath d={CHECK} stroke={p.bg} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" fill="none" strokeDasharray={[CHECK_LENGTH, CHECK_HIDDEN + 4]} animatedProps={checkProps} />
          ) : (
            <Path d={CHECK} stroke={p.bg} strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}

// One burst particle: every third is a 4-point sparkle, the rest dots. Angle, reach, size and tilt come from the index,
// so the burst looks scattered but is the same every time.
function Particle({ index, color, center, travel, fade }: { index: number; color: string; center: number; travel: SharedValue<number>; fade: SharedValue<number> }) {
  const angle = ((index * 30 + 15 + (((index * 7) % 5) - 2) * 5) * Math.PI) / 180;
  const reach = 90 + ((index * 37) % 51);
  // Starts under the circle's rim, so particles appear from behind it rather than sitting on top of it.
  const start = center * 0.6;
  const sparkle = index % 3 === 0;
  const size = sparkle ? 13 + (index % 2) * 3 : 7 + (index % 3);
  const tilt = (index * 23) % 45;
  const style = useAnimatedStyle(() => {
    const t = travel.get();
    const f = fade.get();
    const r = start + (reach - start) * t;
    return {
      opacity: Math.min(1, t * 20) * interpolate(f, [0.35, 1], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: Math.cos(angle) * r }, { translateY: Math.sin(angle) * r }, { scale: 1 - 0.5 * f }, { rotate: `${tilt}deg` }],
    };
  });
  return (
    <Animated.View style={[styles.particle, { left: center - size / 2, top: center - size / 2, width: size, height: size }, sparkle ? null : { borderRadius: size / 2, backgroundColor: color }, style]}>
      {sparkle ? (
        <Svg width={size} height={size} viewBox="0 0 12 12">
          <Path d={SPARKLE} fill={color} />
        </Svg>
      ) : null}
    </Animated.View>
  );
}

export type CountProps = { to: number; prefix?: string; suffix?: string; delay?: number; duration?: number };

// Counts from 0 up to `to` on the UI thread, without a React render per frame. Styled like `GText` weight 800. The
// field may not resize as digits are added, so give it room for the final value (`alignSelf: 'stretch'` with
// `textAlign`). Web and reduced motion show the final value outright.
export function AnimatedCount({ to, prefix = '', suffix = '', delay = 0, duration: ms = 600, style }: CountProps & { style?: StyleProp<TextStyle> }) {
  const reduced = useReducedMotion();
  const counts = !reduced && Platform.OS !== 'web';
  const count = useSharedValue(0);
  useEffect(() => {
    if (counts) count.set(withDelay(delay, withTiming(to, { duration: ms, easing: ease.out })));
  }, [counts, count, delay, ms, to]);
  const animatedProps = useAnimatedProps(() => {
    const text = `${prefix}${Math.round(count.get())}${suffix}`;
    return { text, defaultValue: text };
  });
  const final = `${prefix}${to}${suffix}`;
  if (!counts) {
    return <GText weight={800} style={style}>{final}</GText>;
  }
  return (
    <AnimatedTextInput
      editable={false}
      accessibilityLabel={final}
      underlineColorAndroid="transparent"
      animatedProps={animatedProps}
      style={[styles.count, styles.passThrough, style]}
    />
  );
}

// Springs its child up from `from` after `delay`, with overshoot. `fade` also fades it in, for something that wasn't
// on screen before. Reduced motion keeps only the fade.
export function Pop({ delay = 0, from = 0.6, fade = false, style, children }: PropsWithChildren<{ delay?: number; from?: number; fade?: boolean; style?: StyleProp<ViewStyle> }>) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(reduced ? 1 : from);
  const opacity = useSharedValue(fade ? 0 : 1);
  useEffect(() => {
    if (!reduced) scale.set(withDelay(delay, withSpring(1, spring.pop)));
    if (fade) opacity.set(withDelay(delay, withTiming(1, { duration: duration.state, easing: ease.out, reduceMotion: ReduceMotion.Never })));
  }, [reduced, fade, delay, scale, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ scale: scale.get() }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

// One bump on a small win's icon (the streak flame): up to `to`, then sprung back. Still under reduced motion.
export function Bump({ delay = 0, to = 1.25, children }: PropsWithChildren<{ delay?: number; to?: number }>) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!reduced) scale.set(withDelay(delay, withSequence(withTiming(to, { duration: 100, easing: ease.out }), withSpring(1, spring.pop))));
  }, [reduced, delay, to, scale]);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return <Animated.View style={animated}>{children}</Animated.View>;
}

// Purple (level) pill shown over the level bar when a step crossed into a new level.
export function LevelUpPill({ p, delay }: { p: Palette; delay?: number }) {
  return (
    <Pop delay={delay} fade style={[styles.levelUp, { backgroundColor: `${p.primary}25`, borderColor: p.primary }]}>
      <Icon name="sparkles" color={p.primaryText} size={12} />
      <GText weight={800} style={{ color: p.primaryText, fontSize: 11.5 }}>Level up!</GText>
    </Pop>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.32, shadowRadius: 24 },
  particle: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  count: { fontFamily: 'JakartaExtraBold', padding: 0, margin: 0 },
  passThrough: { pointerEvents: 'none' },
  levelUp: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
});
