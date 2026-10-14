import panelMenu from '../assets/png/retina/ui/menu/panel_menu.png';
import titlePirateBattle from '../assets/png/retina/ui/menu/title_pirate_battle.png';
import buttonPrimaryNormal from '../assets/png/retina/ui/menu/button_primary_normal.png';
import buttonPrimaryHover from '../assets/png/retina/ui/menu/button_primary_hover.png';
import buttonPrimaryPressed from '../assets/png/retina/ui/menu/button_primary_pressed.png';
import buttonSecondaryNormal from '../assets/png/retina/ui/menu/button_secondary_normal.png';
import buttonSecondaryPressed from '../assets/png/retina/ui/menu/button_secondary_pressed.png';
import counterPanel from '../assets/png/retina/ui/hud/counter_panel.png';
import iconHeart from '../assets/png/retina/ui/hud/icon_heart.png';
import iconScore from '../assets/png/retina/ui/hud/icon_score.png';
import iconTime from '../assets/png/retina/ui/hud/icon_time.png';
import healthFrame from '../assets/png/retina/ui/hud/health_frame.png';
import healthFillGreen from '../assets/png/retina/ui/hud/health_fill_green.png';
import buttonRoundNormal from '../assets/png/retina/ui/controls/button_round_normal.png';
import buttonRoundPressed from '../assets/png/retina/ui/controls/button_round_pressed.png';
import iconForward from '../assets/png/retina/ui/controls/icon_forward.png';
import iconTurnLeft from '../assets/png/retina/ui/controls/icon_turn_left.png';
import iconTurnRight from '../assets/png/retina/ui/controls/icon_turn_right.png';
import iconFireFront from '../assets/png/retina/ui/controls/icon_fire_front.png';
import iconFireLeft from '../assets/png/retina/ui/controls/icon_fire_left.png';
import iconFireRight from '../assets/png/retina/ui/controls/icon_fire_right.png';

export const uiAssets = {
  panelMenu,
  titlePirateBattle,
  buttonPrimaryNormal,
  buttonPrimaryHover,
  buttonPrimaryPressed,
  buttonSecondaryNormal,
  buttonSecondaryPressed,
  counterPanel,
  iconHeart,
  iconScore,
  iconTime,
  healthFrame,
  healthFillGreen,
  buttonRoundNormal,
  buttonRoundPressed,
  iconForward,
  iconTurnLeft,
  iconTurnRight,
  iconFireFront,
  iconFireLeft,
  iconFireRight,
} as const;

// Logical sizes from ui_sheet.json. Retina files are rendered at half their pixel size.
export const uiLayout = {
  menuPanel: { width: 384, height: 480, content: { x: 26, y: 30, width: 332, height: 420 } },
  title: { width: 384, height: 128 },
  menuButton: { width: 240, height: 80 },
  counter: { width: 160, height: 56 },
  roundButton: { width: 64, height: 64 },
} as const;
