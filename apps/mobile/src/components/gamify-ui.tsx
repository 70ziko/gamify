import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { type AndroidSymbol, type SFSymbol, SymbolView } from 'expo-symbols';
import type { PropsWithChildren, ReactNode } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

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
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [cardStyle, pressed && styles.pressed]}>
        {children}
      </Pressable>
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

export function PrimaryButton({
  label,
  onPress,
  p,
  icon,
  compact = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  p: Palette;
  icon?: IconName;
  compact?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.buttonShadow, { backgroundColor: p.accentShadow }, style, pressed && styles.pressed, disabled && styles.disabled]}>
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
    </Pressable>
  );
}

export function BackButton({ p, onPress }: { p: Palette; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Go back"
      onPress={onPress}
      style={({ pressed }) => [
        styles.backButton,
        { backgroundColor: p.surface, borderColor: p.border },
        pressed && styles.pressed,
      ]}>
      <GText weight={500} style={{ color: p.muted, fontSize: 32, lineHeight: 31 }}>
        ‹
      </GText>
    </Pressable>
  );
}

export function ProgressBar({
  value,
  p,
  color,
  trackColor,
  height = 7,
}: {
  value: number;
  p: Palette;
  color?: string;
  trackColor?: string;
  height?: number;
}) {
  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor ?? p.sunken, height }]}>
      <View
        style={[
          styles.progressValue,
          { backgroundColor: color ?? p.primary, width: `${Math.max(0, Math.min(100, value))}%` },
        ]}
      />
    </View>
  );
}

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
    <Pressable
      onPress={onPress}
      style={[
        styles.toggle,
        { backgroundColor: on ? p.success : p.borderStrong, justifyContent: on ? 'flex-end' : 'flex-start' },
      ]}>
      <View style={[styles.toggleKnob, { backgroundColor: on ? palette.dark.bg : p.subtle }]} />
    </Pressable>
  );
}

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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: selected ? `${p.primary}25` : p.surface,
          borderColor: selected ? p.primary : p.border,
        },
        style,
        pressed && onPress ? styles.pressed : null,
      ]}>
      <GText weight={selected ? 700 : 600} style={{ color: selected ? p.primaryText : p.muted, fontSize: 13 }}>
        {label}
      </GText>
      {selected && showCheck ? (
        <GText weight={800} style={{ color: p.primaryText, fontSize: 13 }}>
          ✓
        </GText>
      ) : null}
    </Pressable>
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
  return (
    <View style={[styles.nav, { backgroundColor: p.chrome, borderTopColor: p.border, paddingBottom: Math.max(insets.bottom - 8, 12) }]}>
      {tabs.map((tab) => {
        const selected = active === tab;
        if (tab === 'continue') {
          return (
            <Pressable
              key={tab}
              accessibilityRole="button"
              accessibilityLabel="Continue your roadmap"
              onPress={() => onSelect(tab)}
              style={({ pressed }) => [styles.continueTab, pressed && styles.pressed]}>
              <View style={[styles.continueGlow, { boxShadow: `0 8px 22px ${p.accentDeep}66` }]}>
                <LinearGradient
                  colors={[p.accent, p.accentDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.continueOrb, { borderColor: p.chrome }]}>
                  <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 2.6L14.85 9.05L21.9 9.75L16.6 14.45L18.15 21.4L12 17.7L5.85 21.4L7.4 14.45L2.1 9.75L9.15 9.05Z"
                      fill={palette.dark.bg}
                      stroke={palette.dark.bg}
                      strokeWidth={2.6}
                      strokeLinejoin="round"
                    />
                  </Svg>
                </LinearGradient>
              </View>
              <GText weight={700} style={[styles.tabLabel, { color: p.accentDeep }]}>
                Continue
              </GText>
            </Pressable>
          );
        }
        const color = selected ? p.primary : p.dim;
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onSelect(tab)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
            <View style={[styles.tabIconPill, selected && { backgroundColor: `${p.primary}1F` }]}>
              <TabIcon tab={tab} color={color} active={selected} />
            </View>
            <GText weight={700} style={[styles.tabLabel, { color }]}>
              {tabLabels[tab]}
            </GText>
          </Pressable>
        );
      })}
    </View>
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
    <Pressable accessibilityRole="button" hitSlop={8} onPress={onPress} style={({ pressed }) => [styles.sectionLink, pressed && styles.pressed]}>
      {icon ? <Icon name={icon} color={p.accentText} size={14} /> : null}
      <GText weight={700} style={{ color: p.accentText, fontSize: 12 }}>
        {label}
      </GText>
    </Pressable>
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
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
  },
  buttonShadow: {
    borderRadius: 18,
    paddingBottom: 6,
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
