import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { type AndroidSymbol, type SFSymbol, SymbolView } from 'expo-symbols';
import { type ComponentProps, type ComponentType, type PropsWithChildren, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  type TextProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, {
  type CSSAnimationKeyframes,
  type CSSTransitionProperties,
  FadeIn,
  FadeOut,
  Keyframe,
  LayoutAnimationConfig,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { cssEase, duration, ease, haptic, PressableScale, spring } from '@/components/motion';

export type ThemeMode = 'dark' | 'light';

export const palette = {
  dark: {
    bg: '#231A2B',
    overlay: '#1A1320',
    surface: '#30243A',
    raised: '#3A2C45',
    sunken: '#261D30',
    chrome: '#1E1626',
    border: '#42344D',
    borderStrong: '#4C3B58',
    ink: '#F2ECF6',
    muted: '#AEA1BC',
    dim: '#8C8098',
    subtle: '#6B5E77',
    primary: '#B79BFF',
    primaryDeep: '#8E6EF0',
    primaryText: '#D5C6FF',
    accent: '#F4A98C',
    accentDeep: '#EF8F80',
    accentShadow: '#C9705F',
    accentText: '#F5B59D',
    success: '#74C79C',
    streak: '#F0B45E',
    og: '#F7D699',
    cardShadow: 'rgba(0,0,0,.28)',
  },
  light: {
    bg: '#FAF6F8',
    overlay: '#F7F0F4',
    surface: '#FFFFFF',
    raised: '#FFFFFF',
    sunken: '#F0E9F2',
    chrome: '#FFFFFF',
    border: '#EBE0EA',
    borderStrong: '#E3D7E2',
    ink: '#2C2135',
    muted: '#6E6379',
    dim: '#948AA0',
    subtle: '#A69BAD',
    primary: '#7B5CE6',
    primaryDeep: '#5B3FC0',
    primaryText: '#654CC8',
    accent: '#EF927B',
    accentDeep: '#E2765F',
    accentShadow: '#C9604A',
    accentText: '#BF5741',
    success: '#32936F',
    streak: '#BE7B16',
    og: '#F7D699',
    cardShadow: 'rgba(56,35,65,.08)',
  },
} as const;

export type Palette = (typeof palette)[ThemeMode];

// Horizontal screen margin shared by every screen's content, headers and footers.
export const GUTTER = 14;

const fontFamilies = {
  400: 'JakartaRegular',
  500: 'JakartaMedium',
  600: 'JakartaSemiBold',
  700: 'JakartaBold',
  800: 'JakartaExtraBold',
} as const;

type Weight = keyof typeof fontFamilies;

export function GText({
  weight = 500,
  style,
  ...props
}: TextProps & { weight?: Weight }) {
  return <Text {...props} style={[{ fontFamily: fontFamilies[weight] }, style]} />;
}

export function ScreenFrame({
  mode,
  children,
  background,
  bottomColor,
}: PropsWithChildren<{ mode: ThemeMode; background?: string; bottomColor?: string }>) {
  const p = palette[mode];
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.viewport, { backgroundColor: p.bg }]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView
        edges={['top', 'left', 'right', 'bottom']}
        style={[
          styles.device,
          { backgroundColor: background ?? p.bg },
          Platform.OS === 'web' && styles.webSafeArea,
        ]}>
        {/* Paints the home-indicator inset so a bottom sheet or footer that ends at the safe area reaches the screen edge. */}
        {bottomColor ? <View style={[styles.bottomInset, { height: insets.bottom, backgroundColor: bottomColor }]} /> : null}
        {children}
      </SafeAreaView>
    </View>
  );
}

export function ScrollBody({
  children,
  contentStyle,
  backgroundColor,
  bottomInset = 24,
}: PropsWithChildren<{
  contentStyle?: ViewStyle;
  backgroundColor?: string;
  bottomInset?: number;
}>) {
  return (
    <ScrollView
      style={[styles.scroll, backgroundColor ? { backgroundColor } : null]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset }, contentStyle]}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

export function Card({
  p,
  children,
  style,
  raised = false,
  onPress,
}: PropsWithChildren<{
  p: Palette;
  style?: StyleProp<ViewStyle>;
  raised?: boolean;
  onPress?: () => void;
}>) {
  const cardStyle = [
    styles.card,
    {
      backgroundColor: raised ? p.raised : p.surface,
      borderColor: p.border,
      shadowColor: p.cardShadow,
    },
    style,
  ];

  if (onPress) {
    // Big surfaces sink less than buttons.
    return (
      <PressableScale scale={0.98} onPress={onPress} style={cardStyle}>
        {children}
      </PressableScale>
    );
  }
  return <View style={cardStyle}>{children}</View>;
}

export function GradientCard({
  children,
  style,
  colors,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; colors: readonly [string, string, ...string[]] }>) {
  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={style}>
      {children}
    </LinearGradient>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Enabled ↔ disabled and on ↔ off cross-fade instead of snapping.
const fadeTransition: CSSTransitionProperties<ViewStyle> = {
  transitionProperty: ['opacity', 'backgroundColor'],
  transitionDuration: duration.state,
  transitionTimingFunction: cssEase.out,
};

const pressTransition: CSSTransitionProperties<ViewStyle> = {
  transitionProperty: ['transform', 'opacity'],
  transitionDuration: duration.press,
  transitionTimingFunction: cssEase.out,
};

export function PrimaryButton({
  label,
  onPress,
  p,
  icon,
  compact = false,
  disabled = false,
  tapHaptic = true,
  style,
}: {
  label: string;
  onPress: () => void;
  p: Palette;
  icon?: IconName;
  compact?: boolean;
  disabled?: boolean;
  // Off when the action fires its own haptic (checking an answer buzzes success or error), so one press gives one.
  tapHaptic?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  // A physical key: the face sinks onto its darker lip under the finger and springs back up on release.
  const face: ViewStyle = reduced ? { opacity: pressed ? 0.85 : 1 } : { transform: [{ translateY: pressed ? 4 : 0 }] };
  return (
    <AnimatedPressable
      disabled={disabled}
      pressRetentionOffset={16}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        if (tapHaptic) haptic.light();
        onPress();
      }}
      style={[styles.buttonShadow, style, { opacity: disabled ? 0.45 : 1 }, fadeTransition]}>
      {/* The lip sits behind the face rather than painting the whole button, so a sunk face shows no rim above it. */}
      <View style={[styles.buttonLip, { backgroundColor: p.accentShadow }]} />
      <Animated.View
        style={[
          face,
          { transitionProperty: ['transform', 'opacity'], transitionDuration: pressed ? 100 : 140, transitionTimingFunction: cssEase.out },
        ]}>
        <LinearGradient
          colors={[p.accent, p.accentDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.primaryButton, compact && styles.compactButton, icon && styles.iconButton]}>
          {icon ? <Icon name={icon} color={palette.dark.bg} size={compact ? 15 : 17} /> : null}
          <GText weight={800} style={[styles.buttonText, { color: palette.dark.bg }]}>
            {label}
          </GText>
        </LinearGradient>
      </Animated.View>
    </AnimatedPressable>
  );
}

export function BackButton({ p, onPress }: { p: Palette; onPress: () => void }) {
  return (
    <PressableScale
      scale={0.94}
      accessibilityLabel="Go back"
      onPress={onPress}
      style={[styles.backButton, { backgroundColor: p.surface, borderColor: p.border }]}>
      <GText weight={500} style={{ color: p.muted, fontSize: 32, lineHeight: 31 }}>
        ‹
      </GText>
    </PressableScale>
  );
}

// `initial` is where the fill starts on mount (percent, defaults to `value`), so a screen can show progress made
// elsewhere filling in. `delay` holds that fill back (ms) to sequence it after other motion.
export function ProgressBar({
  value,
  p,
  color,
  trackColor,
  height = 7,
  initial,
  delay = 0,
}: {
  value: number;
  p: Palette;
  color?: string;
  trackColor?: string;
  height?: number;
  initial?: number;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const target = clampPercent(value);
  // Without `initial` the bar mounts at its value, so screens that remount on every navigation don't replay a fill.
  const [from] = useState(() => (initial === undefined ? target : clampPercent(initial)));
  const [filled, setFilled] = useState(from === target);
  useEffect(() => {
    if (filled || reduced) return;
    // Waits for the first frame to commit at `from`; only this mount fill is delayed, later changes move at once.
    const timer = setTimeout(() => setFilled(true), delay);
    return () => clearTimeout(timer);
  }, [filled, reduced, delay]);
  const width = filled || reduced ? target : from;
  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor ?? p.sunken, height }]}>
      <Animated.View
        style={[
          styles.progressValue,
          { backgroundColor: color ?? p.primary, width: `${width}%` },
          reduced ? null : { transitionProperty: 'width', transitionDuration: duration.fill, transitionTimingFunction: cssEase.out },
        ]}
      />
    </View>
  );
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

// Knob travel: track width 48, minus 4pt padding on each side, minus the 21pt knob.
const TOGGLE_TRAVEL = 19;

export function Toggle({
  on,
  p,
  onPress,
}: {
  on: boolean;
  p: Palette;
  onPress?: () => void;
}) {
  return (
    <AnimatedPressable
      onPress={onPress && (() => {
        haptic.select();
        onPress();
      })}
      style={[styles.toggle, { backgroundColor: on ? p.success : p.borderStrong }, fadeTransition]}>
      <Animated.View
        style={[
          styles.toggleKnob,
          { backgroundColor: on ? palette.dark.bg : p.subtle, transform: [{ translateX: on ? TOGGLE_TRAVEL : 0 }] },
          {
            transitionProperty: ['transform', 'backgroundColor'],
            transitionDuration: [200, duration.state],
            transitionTimingFunction: cssEase.out,
          },
        ]}
      />
    </AnimatedPressable>
  );
}

// The check pops in when a pill is picked and fades out when it's dropped. Checks already showing when a pill mounts
// stay put, and leaving the screen doesn't play their exit (it would hold the old screen on top of the new one).
const checkIn = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.6 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: ease.out },
}).duration(160);
// Fades are what reduced motion keeps, so they opt out of the builders' default of skipping under it.
const checkInReduced = FadeIn.duration(160).reduceMotion(ReduceMotion.Never);
const checkOut = FadeOut.duration(130).reduceMotion(ReduceMotion.Never);
// A pill grows and shrinks with its check, so its neighbours in a wrapping row glide instead of jumping.
const pillLayout = LinearTransition.duration(180).easing(ease.inOut);

// PressableScale hands extra props to its Animated.Pressable, which takes a layout transition.
const LayoutPressableScale = PressableScale as ComponentType<
  ComponentProps<typeof PressableScale> & { layout?: typeof pillLayout }
>;

export function Pill({
  label,
  p,
  selected = false,
  showCheck = true,
  onPress,
  style,
}: {
  label: string;
  p: Palette;
  selected?: boolean;
  showCheck?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  return (
    <LayoutPressableScale
      scale={0.96}
      disabled={!onPress}
      layout={reduced ? undefined : pillLayout}
      onPress={onPress && (() => {
        haptic.select();
        onPress();
      })}
      style={[
        styles.pill,
        {
          backgroundColor: selected ? `${p.primary}25` : p.surface,
          borderColor: selected ? p.primary : p.border,
        },
        style,
      ]}>
      <GText weight={selected ? 700 : 600} style={{ color: selected ? p.primaryText : p.muted, fontSize: 13 }}>
        {label}
      </GText>
      <LayoutAnimationConfig skipEntering skipExiting>
        {selected && showCheck ? (
          <Animated.View entering={reduced ? checkInReduced : checkIn} exiting={checkOut}>
            <Icon name="check" color={p.primaryText} size={14} />
          </Animated.View>
        ) : null}
      </LayoutAnimationConfig>
    </LayoutPressableScale>
  );
}

export type MainTab = 'home' | 'explore' | 'continue' | 'league' | 'profile';

type SideTab = Exclude<MainTab, 'continue'>;

const tabLabels: Record<SideTab, string> = {
  home: 'Home',
  explore: 'Explore',
  league: 'League',
  profile: 'Profile',
};

// Tab icons are the design canvas's nav SVGs (Gamify App.dc.html). Active tabs get a tinted fill.
function TabIcon({ tab, color, active }: { tab: SideTab; color: string; active: boolean }) {
  const fill = active ? `${color}40` : 'none';
  switch (tab) {
    case 'home':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Path d="M3 9.5L11 3L19 9.5V18A1.5 1.5 0 0 1 17.5 19.5H4.5A1.5 1.5 0 0 1 3 18Z" stroke={color} strokeWidth={2} strokeLinejoin="round" fill={fill} />
        </Svg>
      );
    case 'explore':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Circle cx={11} cy={11} r={8.5} stroke={color} strokeWidth={2} fill={fill} />
          <Path d="M14.2 7.8L12.3 12.3L7.8 14.2L9.7 9.7Z" fill={color} />
        </Svg>
      );
    case 'league':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Path d="M5 4H17V9A6 6 0 0 1 5 9Z" stroke={color} strokeWidth={2} strokeLinejoin="round" fill={fill} />
          <Path d="M8 19H14M11 15V19" stroke={color} strokeWidth={2} strokeLinecap="round" />
          <Path d="M5 6H2.5A2.5 2.5 0 0 0 5 10M17 6H19.5A2.5 2.5 0 0 1 17 10" stroke={color} strokeWidth={1.8} />
        </Svg>
      );
    case 'profile':
      return (
        <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
          <Circle cx={11} cy={7.5} r={4} stroke={color} strokeWidth={2} fill={fill} />
          <Path d="M3.5 19C4.4 15.4 7.4 13.5 11 13.5C14.6 13.5 17.6 15.4 18.5 19" stroke={color} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      );
  }
}

export function BottomNav({
  active,
  p,
  onSelect,
}: {
  active: MainTab;
  p: Palette;
  onSelect: (tab: MainTab) => void;
}) {
  const insets = useSafeAreaInsets();
  const tabs: MainTab[] = ['home', 'explore', 'continue', 'league', 'profile'];
  // Every screen mounts its own nav, so a tab switch shows up as a nav mounting with a different active tab.
  const [switched] = useState(() => lastTab !== undefined && lastTab !== active);
  useEffect(() => {
    lastTab = active;
  }, [active]);
  return (
    <View style={[styles.nav, { backgroundColor: p.chrome, borderTopColor: p.border, paddingBottom: Math.max(insets.bottom - 8, 12) }]}>
      {tabs.map((tab) =>
        tab === 'continue' ? (
          <ContinueTab key={tab} p={p} onPress={() => onSelect(tab)} />
        ) : (
          <SideTabButton key={tab} tab={tab} p={p} selected={active === tab} pop={switched && active === tab} onPress={() => onSelect(tab)} />
        ),
      )}
    </View>
  );
}

// The tab the last mounted nav showed, for telling a tab switch from a return to the same tab.
let lastTab: MainTab | undefined;

// Tab switches don't slide anything: the newly active pill pops in place and its tint fades in.
const tabPop: CSSAnimationKeyframes<ViewStyle> = { from: { transform: [{ scale: 0.88 }] }, to: { transform: [{ scale: 1 }] } };
const tabTintIn: CSSAnimationKeyframes<ViewStyle> = { from: { opacity: 0 }, to: { opacity: 1 } };

function SideTabButton({ tab, p, selected, pop, onPress }: { tab: SideTab; p: Palette; selected: boolean; pop: boolean; onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  const color = selected ? p.primary : p.dim;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      pressRetentionOffset={16}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={onPress}
      style={styles.tab}>
      <Animated.View style={[reduced ? { opacity: pressed ? 0.8 : 1 } : { transform: [{ scale: pressed ? 0.9 : 1 }] }, pressTransition]}>
        <Animated.View
          style={[styles.tabIconPill, pop && !reduced && { animationName: tabPop, animationDuration: 200, animationTimingFunction: cssEase.out }]}>
          {selected ? (
            <Animated.View
              style={[
                styles.tabTint,
                { backgroundColor: `${p.primary}1F` },
                pop && { animationName: tabTintIn, animationDuration: 150, animationTimingFunction: cssEase.out },
              ]}
            />
          ) : null}
          <TabIcon tab={tab} color={color} active={selected} />
        </Animated.View>
      </Animated.View>
      <GText weight={700} style={[styles.tabLabel, { color }]}>
        {tabLabels[tab]}
      </GText>
    </Pressable>
  );
}

// One point of the star per press: 72° lands it back on its own outline, and turns add up across presses.
const STAR_TURN = 72;

function ContinueTab({ p, onPress }: { p: Palette; onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  const turns = useRef(0);
  const rotation = useSharedValue(0);
  const starStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue your roadmap"
      pressRetentionOffset={16}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onPress={() => {
        haptic.light();
        if (!reduced) {
          turns.current += 1;
          rotation.set(withSpring(turns.current * STAR_TURN, spring.snap));
        }
        onPress();
      }}
      style={styles.continueTab}>
      <Animated.View
        style={[
          styles.continueGlow,
          { boxShadow: `0 8px 22px ${p.accentDeep}66` },
          reduced ? { opacity: pressed ? 0.8 : 1 } : { transform: [{ scale: pressed ? 0.94 : 1 }] },
          pressTransition,
        ]}>
        <LinearGradient
          colors={[p.accent, p.accentDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.continueOrb, { borderColor: p.chrome }]}>
          <Animated.View style={[styles.star, starStyle]}>
            <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 2.6L14.85 9.05L21.9 9.75L16.6 14.45L18.15 21.4L12 17.7L5.85 21.4L7.4 14.45L2.1 9.75L9.15 9.05Z"
                fill={palette.dark.bg}
                stroke={palette.dark.bg}
                strokeWidth={2.6}
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>
        </LinearGradient>
      </Animated.View>
      <GText weight={700} style={[styles.tabLabel, { color: p.accentDeep }]}>
        Continue
      </GText>
    </Pressable>
  );
}

export function MainScaffold({
  mode,
  active,
  children,
  onSelect,
  noScroll = false,
}: PropsWithChildren<{
  mode: ThemeMode;
  active: MainTab;
  onSelect: (tab: MainTab) => void;
  noScroll?: boolean;
}>) {
  const p = palette[mode];
  return (
    <ScreenFrame mode={mode}>
      {noScroll ? (
        <View style={styles.mainFlex}>{children}</View>
      ) : (
        <ScrollBody contentStyle={styles.mainContent} bottomInset={105}>
          {children}
        </ScrollBody>
      )}
      <BottomNav active={active} p={p} onSelect={onSelect} />
    </ScreenFrame>
  );
}

// Each icon is an SF Symbol on iOS and a Material Symbol on Android and web (expo-symbols loads the font there).
const icons = {
  bell: ['bell.fill', 'notifications'],
  bolt: ['bolt.fill', 'bolt'],
  book: ['book.fill', 'menu_book'],
  briefcase: ['briefcase.fill', 'work'],
  brush: ['paintbrush.fill', 'brush'],
  chart: ['chart.line.uptrend.xyaxis', 'trending_up'],
  check: ['checkmark', 'check'],
  checklist: ['checklist', 'checklist'],
  clock: ['clock', 'schedule'],
  close: ['xmark', 'close'],
  code: ['chevron.left.forwardslash.chevron.right', 'code'],
  dumbbell: ['dumbbell.fill', 'fitness_center'],
  flag: ['flag.fill', 'flag'],
  flame: ['flame.fill', 'local_fire_department'],
  fork: ['fork.knife', 'restaurant'],
  gear: ['gearshape.fill', 'settings'],
  globe: ['globe', 'public'],
  language: ['character.bubble', 'translate'],
  moon: ['moon.stars.fill', 'bedtime'],
  piano: ['pianokeys', 'piano'],
  play: ['play.fill', 'play_arrow'],
  plus: ['plus', 'add'],
  refresh: ['arrow.clockwise', 'refresh'],
  search: ['magnifyingglass', 'search'],
  smile: ['face.smiling', 'sentiment_satisfied'],
  snowflake: ['snowflake', 'ac_unit'],
  sparkles: ['sparkles', 'auto_awesome'],
  star: ['star.fill', 'star'],
  store: ['storefront', 'storefront'],
  sun: ['sun.max.fill', 'sunny'],
  sunrise: ['sunrise.fill', 'wb_twilight'],
  trophy: ['trophy.fill', 'trophy'],
} as const satisfies Record<string, readonly [SFSymbol, AndroidSymbol]>;

export type IconName = keyof typeof icons;

export function Icon({ name, color, size = 20 }: { name: IconName; color: string; size?: number }) {
  const [ios, material] = icons[name];
  return <SymbolView name={{ ios, android: material, web: material }} tintColor={color} size={size} />;
}

// Pass `icon` for a symbol, or `glyph` for text such as a unit number or an emoji.
export function IconTile({
  icon,
  glyph,
  color,
  backgroundColor,
  size = 38,
  rounded = 13,
  textSize = 18,
}: {
  icon?: IconName;
  glyph?: string;
  color: string;
  backgroundColor: string;
  size?: number;
  rounded?: number;
  textSize?: number;
}) {
  return (
    <View style={{ width: size, height: size, borderRadius: rounded, backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
      {icon ? (
        <Icon name={icon} color={color} size={textSize + 2} />
      ) : (
        <GText weight={800} style={{ color, fontSize: textSize, lineHeight: textSize + 4 }}>
          {glyph}
        </GText>
      )}
    </View>
  );
}

// Stand-in for the mascot until its artwork exists. Keep the footprint so the real art drops into the same slot.
export function MascotPlaceholder({ size = 68 }: { size?: number }) {
  return (
    <View accessibilityLabel="Mascot" style={[styles.mascot, { width: size, height: size, borderRadius: size * 0.32, backgroundColor: palette.dark.og }]}>
      <Icon name="smile" color={palette.dark.bg} size={size * 0.5} />
    </View>
  );
}

export function SectionTitle({
  children,
  p,
  right,
}: PropsWithChildren<{ p: Palette; right?: ReactNode }>) {
  return (
    <View style={styles.sectionTitleRow}>
      <GText weight={800} style={[styles.sectionTitle, { color: p.ink }]}>
        {children}
      </GText>
      {right}
    </View>
  );
}

// The one style for actions on the right of a section title ("See all", "Add roadmap").
export function SectionLink({ p, label, icon, onPress }: { p: Palette; label: string; icon?: IconName; onPress?: () => void }) {
  return (
    <PressableScale scale={0.96} accessibilityRole="button" hitSlop={8} onPress={onPress} style={styles.sectionLink}>
      {icon ? <Icon name={icon} color={p.accentText} size={14} /> : null}
      <GText weight={700} style={{ color: p.accentText, fontSize: 12 }}>
        {label}
      </GText>
    </PressableScale>
  );
}

export function Overline({ children, p, style }: PropsWithChildren<{ p: Palette; style?: StyleProp<TextStyle> }>) {
  return (
    <GText weight={700} style={[styles.overline, { color: p.dim }, style]}>
      {children}
    </GText>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    alignItems: 'center',
  },
  device: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
  },
  bottomInset: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  webSafeArea: {
    paddingTop: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainContent: {
    paddingHorizontal: GUTTER,
    paddingTop: 14,
  },
  mainFlex: {
    flex: 1,
  },
  card: {
    borderWidth: 1,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 22,
    elevation: 2,
  },
  buttonShadow: {
    borderRadius: 18,
    paddingBottom: 6,
  },
  buttonLip: {
    position: 'absolute',
    top: 6,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 18,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  compactButton: {
    minHeight: 48,
  },
  iconButton: {
    flexDirection: 'row',
    gap: 8,
  },
  buttonText: {
    fontSize: 15.5,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressValue: {
    height: '100%',
    borderRadius: 999,
  },
  toggle: {
    width: 48,
    height: 29,
    borderRadius: 999,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleKnob: {
    width: 21,
    height: 21,
    borderRadius: 999,
  },
  pill: {
    minHeight: 38,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  nav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  tab: {
    width: 64,
    alignItems: 'center',
    gap: 3,
  },
  tabIconPill: {
    width: 52,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabTint: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
  continueTab: {
    width: 74,
    alignItems: 'center',
    gap: 3,
    marginTop: -34,
  },
  continueGlow: {
    borderRadius: 22,
  },
  continueOrb: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The star's centre sits at (12, 13.03) of its 24-unit viewBox, so it turns about that point, not the view's centre.
  star: {
    transformOrigin: ['50%', '54.3%', 0],
  },
  mascot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    letterSpacing: -0.2,
  },
  overline: {
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
