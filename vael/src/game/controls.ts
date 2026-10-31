import { input } from '../engine/input';

/** One frame of player intent, from devices or from a test script. */
export interface Controls {
  x: number;
  y: number;
  jumpPressed: boolean;
  jumpHeld: boolean;
  attackPressed: boolean;
  bladePressed: boolean;
  blinkPressed: boolean;
  dashPressed: boolean;
  healHeld: boolean;
  artPressed: boolean;
  interactPressed: boolean;
}

export const NO_CONTROLS: Controls = {
  x: 0, y: 0, jumpPressed: false, jumpHeld: false, attackPressed: false, bladePressed: false,
  blinkPressed: false, dashPressed: false, healHeld: false, artPressed: false, interactPressed: false,
};

/** Reads the devices; presses are buffered for a few frames (consumed by the player when used). */
export function readControls(): Controls {
  return {
    x: input.axisX,
    y: input.axisY,
    jumpPressed: input.pressed('jump'),
    jumpHeld: input.held('jump'),
    attackPressed: input.pressed('attack'),
    bladePressed: input.pressed('blade'),
    blinkPressed: input.pressed('blink'),
    dashPressed: input.pressed('dash'),
    healHeld: input.held('heal'),
    artPressed: input.pressed('art'),
    interactPressed: input.pressed('up'),
  };
}
