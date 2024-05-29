import {
  LitElement,
  html,
  TemplateResult,
  CSSResult,
  css,
  PropertyValues,
} from 'lit';
import { property } from 'lit/decorators.js';
import {
  ActionConfig,
  HomeAssistant,
  LovelaceCardConfig,
} from 'custom-card-helpers';
import { HassEntity } from 'home-assistant-js-websocket';

export interface PowerCardConfig extends LovelaceCardConfig {
  type: string;
  name?: string;

  //Line settings
  hide_inactive_entities?: boolean;
  speed_factor?: number;

  // Icons
  grid_icon?: string;
  battery_icon?: string;
  pv0_icon?: string;
  pv1_icon?: string;
  inverter0_icon?: string;
  inverter1_icon?: string;
  building0_icon?: string;
  building1_icon?: string;
  building2_icon?: string;
  building3_icon?: string;
  appliance0_icon?: string;
  appliance1_icon?: string;
  appliance2_icon?: string;
  appliance3_icon?: string;
  appliance4_icon?: string;
  ev0_icon?: string;
  ev1_icon?: string;
  ev2_icon?: string;

  // What click through to. The "leaf" node ev and appliances implicitly click through to their
  // entity from their parent to themselves
  grid_entity?: string;
  battery_entity?: string;
  pv0_entity?: string;
  pv1_entity?: string;
  inverter0_entity?: string;
  inverter1_entity?: string;
  building0_entity?: string;
  building1_entity?: string;
  building2_entity?: string;
  building3_entity?: string;

  // Power from one thing to another
  pv0_to_battery_entity?: string;
  pv0_to_inverter0_entity?: string;
  pv1_to_inverter1_entity?: string;
  battery_to_inverter0_entity?: string;
  inverter0_to_battery_entity?: string;
  inverter1_to_inverter0_entity?: string;
  inverter0_to_building1_entity?: string;
  inverter0_to_grid_entity?: string;
  grid_to_inverter0_entity?: string;
  grid_to_building1_entity?: string;
  inverter1_to_grid_entity?: string;
  inverter1_to_building1_entity?: string;
  building1_to_ev1_entity?: string;
  building1_to_building0_entity?: string;
  building1_to_building2_entity?: string;
  building1_to_building3_entity?: string;
  building1_to_appliance2_entity?: string;
  building1_to_appliance0_entity?: string;
  building0_to_ev0_entity?: string;
  building0_to_ev2_entity?: string;
  building0_to_appliance1_entity?: string;
  building2_to_appliance4_entity?: string;
  building3_to_appliance3_entity?: string;

  // Extra entities that are shown on the card
  grid_extra_entity?: string;
  pv0_extra_entity?: string;
  pv1_extra_entity?: string;
  inverter0_extra_entity?: string;
  inverter1_extra_entity?: string;
  building0_extra_entity?: string;
  building1_extra_entity?: string;
  building2_extra_entity?: string;
  building3_extra_entity?: string;
  battery_extra_entity?: string;
  appliance0_extra_entity?: string;
  appliance1_extra_entity?: string;
  appliance2_extra_entity?: string;
  appliance3_extra_entity?: string;
  appliance4_extra_entity?: string;
  ev0_extra_entity?: string;
  ev1_extra_entity?: string;
  ev2_extra_entity?: string;

  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export class BubbleData {
  public mainValue: number = 0;
  public mainUnitOfMeasurement: string | undefined;
  public clickEntitySlot: string | null = null;
  public clickEntityHassState: HassEntity | null = null;
  public icon: string | undefined;
  public extraValue: string | undefined;
  public extraUnitOfMeasurement: string | undefined;
  public noEntitiesWithValueFound = true;
  public color: string | undefined;
  public disabled = false;
}

export class SensorElement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public value: any;
  public speed = 0;
  public currentDelta = 0;
  public maxPosition = 30;
  public unitOfMeasurement = '';
  public entity = '';
  public circle?: SVGPathElement;
  public line?: SVGPathElement;
  public lineLength: number | null = null;
  public sourceColor: string = '';
  public destColor: string = '';
  public sourceR: number = 0;
  public sourceG: number = 0;
  public sourceB: number = 0;
  public destR: number = 0;
  public destG: number = 0;
  public destB: number = 0;
  public nonZeroInARow = 0;
  public prevTimestamp = 0;
  public entitySlot: string;
  private static readonly defaultSpeedFactor = 0.04;

  constructor(entity: string, enitySlot: string) {
    this.entity = entity;
    this.entitySlot = enitySlot;
    this.value = 0;
  }

  public setValueAndUnitOfMeasurement(
    entityState: string | undefined,
    unitOfMeasurement: string | undefined,
  ): void {
    if (entityState === undefined) {
      this.value = 0;
      return;
    }

    if (unitOfMeasurement === undefined) {
      this.value = entityState;
      return;
    }

    const valueFromState = parseFloat(entityState);

    switch (unitOfMeasurement) {
      case 'W':
      case 'w':
      case 'kW':
        this.value = valueFromState;
        if (unitOfMeasurement === 'kW') {
          this.value *= 1000;
        }
        this.unitOfMeasurement = 'W';
        this.value = Math.round(this.value);
        break;
      case '%':
        this.value = valueFromState;
        this.unitOfMeasurement = unitOfMeasurement;
        break;
      default:
        this.value = entityState;
        this.unitOfMeasurement = unitOfMeasurement;
    }
  }

  public spuriousValue(): boolean {
    return this.nonZeroInARow > 3;
  }

  public setSpeed(factor: number | undefined): void {
    this.speed = 0;

    let speedFactor: number;

    if (factor === undefined || factor > 1 || factor <= 0) {
      speedFactor = SensorElement.defaultSpeedFactor;
    } else {
      speedFactor = factor;
    }

    this.speed = (speedFactor * this.value) / 1000;

    if (this.speed > 0) {
      this.nonZeroInARow++;
    } else {
      this.nonZeroInARow = 0;
    }
  }

  public setColors(sourceColor: string, destColor: string): void {
    this.sourceColor = sourceColor;
    this.destColor = destColor;

    let startColor = sourceColor;
    let endColor = destColor;

    if (sourceColor.startsWith('var(')) {
      startColor = getComputedStyle(document.documentElement)
        .getPropertyValue(sourceColor.substring(4, sourceColor.length - 1))
        .trim();
    }

    if (destColor.startsWith('var(')) {
      endColor = getComputedStyle(document.documentElement)
        .getPropertyValue(destColor.substring(4, destColor.length - 1))
        .trim();
    }

    this.sourceR = parseInt(startColor.slice(1, 3), 16);
    this.sourceG = parseInt(startColor.slice(3, 5), 16);
    this.sourceB = parseInt(startColor.slice(5, 7), 16);
    this.destR = parseInt(endColor.slice(1, 3), 16);
    this.destG = parseInt(endColor.slice(3, 5), 16);
    this.destB = parseInt(endColor.slice(5, 7), 16);
  }
}

export class PowerCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property() private config!: PowerCardConfig;
  @property() private oldWidth = 100;
  @property({ attribute: false }) public cardElements: Map<
    string,
    SensorElement
  > = new Map();

  private disabledEntities: Set<string> = new Set();
  private pxRate = 4;
  private powerCardElement?: HTMLElement;

  readonly colorMapping: { [key: string]: string } = {
    inverter: '#ff702b',
    pv: 'var(--warning-color)',
    grid: 'var(--primary-text-color)',
    battery: 'var(--success-color)',
    building: 'var(--info-color)',
    appliance: 'var(--error-color)',
    ev: '#a649c8',
  };

  private mapEntityToColors(entity: string): [string, string] {
    let source = '';
    let target = '';

    if (entity.includes('_to_')) {
      const parts = entity.split('_to_');
      source = parts[0];
      target = parts[1].split('_')[0];
    } else {
      const parts = entity.split('_');
      source = parts[0];
      target = source;
    }

    // Remove numbers from names as they aren't used for coloring
    const processStrings = (str: string, prefix: string) => ({
      str: str.startsWith(prefix) ? prefix : str,
    });

    ['appliance', 'ev', 'building', 'inverter', 'pv'].forEach(nodeName => {
      target = processStrings(target, nodeName).str;
      source = processStrings(source, nodeName).str;
    });

    return [this.colorMapping[source], this.colorMapping[target]];
  }

  public setConfig(config: LovelaceCardConfig): void {
    if (!config) {
      throw new Error('common.invalid_configuration');
    }

    this.config = {
      ...config,
    };

    if (this.config.grid_icon == null)
      this.config.grid_icon = 'mdi:transmission-tower';

    if (this.config.pv0_icon == null)
      this.config.pv0_icon = 'mdi:solar-power-variant';
    if (this.config.pv1_icon == null)
      this.config.pv1_icon = 'mdi:solar-power-variant';

    if (this.config.inverter0_icon == null)
      this.config.inverter0_icon = 'mdi:meter-electric';
    if (this.config.inverter1_icon == null)
      this.config.inverter1_icon = 'mdi:meter-electric';

    if (this.config.building0_icon == null)
      this.config.building0_icon = 'mdi:home';
    if (this.config.building1_icon == null)
      this.config.building1_icon = 'mdi:home';
    if (this.config.building2_icon == null)
      this.config.building2_icon = 'mdi:home';
    if (this.config.building3_icon == null)
      this.config.building3_icon = 'mdi:home';

    if (this.config.battery_icon == null)
      this.config.battery_icon = 'mdi:battery-medium';

    if (this.config.appliance0_icon == null)
      this.config.appliance0_icon = 'mdi:air-filter';
    if (this.config.appliance1_icon == null)
      this.config.appliance1_icon = 'mdi:air-filter';
    if (this.config.appliance2_icon == null)
      this.config.appliance2_icon = 'mdi:air-filter';
    if (this.config.appliance3_icon == null)
      this.config.appliance3_icon = 'mdi:air-filter';
    if (this.config.appliance4_icon == null)
      this.config.appliance4_icon = 'mdi:air-filter';

    if (this.config.ev0_icon == null) this.config.ev0_icon = 'mdi:car-sports';
    if (this.config.ev1_icon == null) this.config.ev1_icon = 'mdi:car-sports';
    if (this.config.ev2_icon == null) this.config.ev2_icon = 'mdi:car-sports';

    if (this.config.speed_factor == null) this.config.speed_factor = 0.04;

    this.createCardElements();

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const obj = this;
    setInterval(this.animateCircles, 15, obj);
  }

  private createCardElements(): void {
    Object.keys(this.config).forEach(key => {
      if (this.config[key] != null && key.includes('_entity')) {
        const sensorName = this.config[key].toString();
        this.cardElements.set(key, new SensorElement(sensorName, key));

        const [sourceColor, targetColor] = this.mapEntityToColors(key);
        this.cardElements.get(key)?.setColors(sourceColor, targetColor);
      }
    });
  }

  public getCardSize() {
    return 5;
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  private changeStylesDependingOnWidth(
    newWidth: number,
    oldWidth: number,
  ): number {
    if (document.readyState !== 'complete' || oldWidth === newWidth) {
      return oldWidth;
    }

    if (this.shadowRoot == null) return oldWidth;

    const powerCardElement = <HTMLElement>(
      this.shadowRoot.querySelector('#power-card')
    );

    if (powerCardElement == null) return oldWidth;

    const pxRate = newWidth / 120;

    this.cardElements.forEach((_, key) => {
      const element = this.cardElements.get(key);
      if (element !== undefined) element.lineLength = null;
    });

    // icons
    powerCardElement
      .querySelectorAll('.acc_container')
      .forEach((_currentValue, currentIndex, iconContainerItem) => {
        const iconContainer = <HTMLElement>iconContainerItem[currentIndex];
        iconContainer.style.height = 9 * pxRate + 'px';
        iconContainer.style.width = 9 * pxRate + 'px';
        iconContainer.style.padding = 5 * pxRate + 'px';
      });

    powerCardElement
      .querySelectorAll('ha-icon')
      .forEach((_currentValue, currentIndex, icons) => {
        const icon = <HTMLElement>(
          icons[currentIndex].shadowRoot?.querySelector('ha-svg-icon')
        );
        if (icon != null) {
          icon.style.height = 9 * pxRate + 'px';
          icon.style.width = 9 * pxRate + 'px';
        }
      });

    // text
    powerCardElement
      .querySelectorAll<HTMLElement>('.acc_text')
      .forEach(icontext => {
        icontext.style['font-size'] = 3 * pxRate + 'px';
        icontext.style['margin-top'] = -0.5 * pxRate + 'px';
        icontext.style.width = 10 * pxRate + 'px';
      });

    powerCardElement
      .querySelectorAll<HTMLElement>('.acc_text_extra')
      .forEach(icontextExtra => {
        icontextExtra.style['font-size'] = 3 * pxRate + 'px';
        icontextExtra.style.top = 1 * pxRate + 'px';
        icontextExtra.style.width = 10 * pxRate + 'px';
      });

    return newWidth;
  }

  public writeBubbleDiv(bubbleData: BubbleData): TemplateResult {
    if (bubbleData.noEntitiesWithValueFound) {
      bubbleData.disabled = true;
      return html``;
    }

    if (bubbleData.disabled) {
      bubbleData.color = 'rgb(100, 100, 100)';
    }

    if (
      bubbleData.extraValue !== undefined &&
      (bubbleData.icon === 'mdi:battery-medium' ||
        bubbleData.icon === 'mdi:battery')
    ) {
      bubbleData.icon = this.getBatteryIcon(
        parseFloat(bubbleData.extraValue),
        bubbleData.mainValue,
        bubbleData.disabled,
      );
    }

    return html`<div
      class="acc_container ${bubbleData.clickEntitySlot}"
      style="${'width:' +
      9 * this.pxRate +
      'px; height: ' +
      9 * this.pxRate +
      'px; padding:' +
      5 * this.pxRate +
      'px; color: ' +
      bubbleData.color +
      '; border: 1px solid ' +
      bubbleData.color +
      ';'}"
      @click="${() => this._handleClick(bubbleData.clickEntityHassState)}"
    >
      ${bubbleData.extraValue !== null
        ? html` <div
            class="acc_text_extra"
            style="font-size:${3 * this.pxRate + 'px'};
                        top: ${1 * this.pxRate + 'px'};
                        width: ${10 * this.pxRate + 'px'};"
          >
            ${bubbleData.extraValue}${bubbleData.extraUnitOfMeasurement}
          </div>`
        : html``}
      <ha-icon class="acc_icon" icon="${bubbleData.icon}"></ha-icon>
      <div
        class="acc_text"
        style="font-size:${3 * this.pxRate + 'px'}; margin-top:${-0.5 *
          this.pxRate +
        'px'}; width: ${10 * this.pxRate + 'px'}"
      >
        ${bubbleData.mainValue}${bubbleData.mainUnitOfMeasurement}
      </div>
    </div>`;
  }

  private getBatteryIcon(
    batteryValue: number,
    batteryChargeDischargeValue: number,
    disabled: boolean,
  ) {
    const emptyValue = 5;

    let tempSocValue = batteryValue;
    if (batteryValue <= emptyValue) {
      tempSocValue = 0;
    }

    const batteryStateRoundedValue = Math.ceil(tempSocValue / 10) * 10;
    let batteryStateIconString = '-' + batteryStateRoundedValue.toString();

    // show charging icon beside battery state
    let batteryCharging: string = '-charging';
    if (batteryChargeDischargeValue <= 0 || disabled) {
      batteryCharging = '';
    }

    if (batteryStateRoundedValue === 100) {
      batteryStateIconString = '';
    }
    if (batteryStateRoundedValue <= emptyValue) {
      batteryStateIconString = '-outline';
    }

    return 'mdi:battery' + batteryCharging + batteryStateIconString;
  }

  public writeCircleAndStraightLine(
    sensorName: string,
    line: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      detourX: number;
      detourY: number;
    },
  ) {
    const entity = this.cardElements.get(sensorName);
    if (entity == null) return html``;

    return html`<svg>
      <defs>
        <linearGradient
          id="${sensorName + '_gradient'}"
          gradientUnits="userSpaceOnUse"
          x1="${line.startX}"
          y1="${line.startY}"
          x2="${line.endX}"
          y2="${line.endY}"
        >
          <stop offset="0%" style="stop-color:${entity.sourceColor};" />
          <stop offset="100%" style="stop-color:${entity.destColor};" />
        </linearGradient>
      </defs>
      <path
        d="${'M' +
        line.startX +
        ',' +
        line.startY +
        ' L' +
        line.detourX +
        ',' +
        line.detourY +
        ' L' +
        line.endX +
        ',' +
        line.endY}"
        id="${sensorName + '_line'}"
        stroke="url(#${sensorName + '_gradient'})"
        fill="none"
        stroke-width="1"
      ></path>
      <circle r="4" cx="0" cy="4" id="${sensorName + '_circle'}"></circle>
    </svg>`;
  }

  public _handleClick(stateObj: HassEntity | null) {
    if (stateObj == null) return;
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      cancelable: true,
      composed: true,
      detail: { entityId: stateObj.entity_id },
    });
    if (this.shadowRoot == null) return;
    this.shadowRoot.dispatchEvent(event);
  }

  async firstUpdated(): Promise<void> {
    // Give the browser a chance to paint
    await new Promise(r => setTimeout(r, 0));
    this.oldWidth = this.changeStylesDependingOnWidth(
      this.clientWidth,
      this.oldWidth,
    );
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this.redraw = this.redraw.bind(this);
    window.addEventListener('resize', this.redraw);
  }

  public shouldUpdate(changedProperties: PropertyValues): boolean {
    requestAnimationFrame(timestamp => {
      this.updateAllCircles(timestamp);
    });

    // Update only when our values in hass changed
    let update = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array.from(changedProperties.keys()).some((propName: any) => {
      const oldValue = changedProperties.get(propName);
      if (propName === 'hass' && oldValue) {
        update = update && this.sensorChangeDetected(oldValue);
      }
      return !update;
    });
    return update;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sensorChangeDetected(oldValue: any): boolean {
    let change = false;
    this.cardElements.forEach((_, key) => {
      if (
        this.hass.states[this.config[key]] !== undefined &&
        this.hass.states[this.config[key]].state !==
          oldValue.states[this.config[key]].state
      ) {
        change = true;
      }
    });
    return change;
  }

  public async performUpdate(): Promise<void> {
    this.cardElements.forEach(sensor => {
      if (this.hass.states[sensor.entity]) {
        sensor.setValueAndUnitOfMeasurement(
          this.hass.states[sensor.entity].state,
          this.hass.states[sensor.entity].attributes.unit_of_measurement,
        );
        sensor.setSpeed(this.config.speed_factor);
      }
    });

    super.performUpdate();
  }

  protected render(): TemplateResult | void {
    const newWidth = this.clientWidth <= 100 ? 250 : this.clientWidth;

    this.pxRate = newWidth / 120;

    let svgViewWidth: number = 42 * this.pxRate;
    let svgViewHeight: number = 42 * this.pxRate;

    //Get the center point of every circle in the grid
    const gridAreas = [
      'pv_0',
      'pv_1',
      'battery',
      'inverter_0',
      'inverter_1',
      'ev_0',
      'ev_1',
      'grid',
      'building_0',
      'ev_2',
      'appliance_0',
      'building_1',
      'building_2',
      'appliance_1',
      'appliance_2',
      'building_3',
      'appliance_3',
      'appliance_4',
    ];

    // A map to store the center coordinates of each grid cell
    const centerCoordinates: Record<string, { x: number; y: number }> = {};
    const lines: Record<
      string,
      {
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        detourX: number;
        detourY: number;
      }
    > = {};

    if (this.shadowRoot != null) {
      const powerCardElement = <HTMLElement>(
        this.shadowRoot.querySelector('#power-card')
      );

      if (powerCardElement != null) {
        const gridContainer = powerCardElement.querySelector(
          '.grid_container',
        ) as HTMLElement | null;

        if (gridContainer != null) {
          gridContainer.style.gap = `${10 * this.pxRate}px`;

          const gridContainerRect = gridContainer.getBoundingClientRect();
          svgViewWidth = gridContainerRect.width;
          svgViewHeight = gridContainerRect.height;

          let r: number = 0;

          // Get the center coordinates of each grid cell
          gridAreas.forEach(area => {
            const el = gridContainer.querySelector('.' + area);
            if (el) {
              const rect = el.getBoundingClientRect();

              centerCoordinates[area.replace(/_/g, '')] = {
                x: rect.left - gridContainerRect.left + rect.width / 2,
                y: rect.top - gridContainerRect.top + rect.height / 2,
              };

              r = rect.width / 2;
            }
          });

          // Generate all of the line start and end points
          Object.keys(this.config).forEach(key => {
            if (this.config[key] != null && key.includes('_to_')) {
              const parts = key.split('_to_');
              const source = parts[0];
              const target = parts[1].split('_')[0];

              //If the key is inverter0_to_building1, then we need to add a detour to the line
              if (key.includes('inverter0_to_building1')) {
                const detourX =
                  centerCoordinates['grid'].x -
                  (centerCoordinates['grid'].x - centerCoordinates['ev1'].x) /
                    2;

                const detourY = centerCoordinates['grid'].y;

                let angle = Math.atan2(
                  detourY - centerCoordinates[source].y,
                  detourX - centerCoordinates[source].x,
                );

                const startX =
                  centerCoordinates[source].x + r * Math.cos(angle);
                const startY =
                  centerCoordinates[source].y + r * Math.sin(angle);

                angle = Math.atan2(
                  centerCoordinates[target].y - detourY,
                  centerCoordinates[target].x - detourX,
                );

                const endX = centerCoordinates[target].x - r * Math.cos(angle);
                const endY = centerCoordinates[target].y - r * Math.sin(angle);

                lines[key] = {
                  startX,
                  startY,
                  endX,
                  endY,
                  detourX,
                  detourY,
                };
              } else {
                const angle = Math.atan2(
                  centerCoordinates[target].y - centerCoordinates[source].y,
                  centerCoordinates[target].x - centerCoordinates[source].x,
                );

                lines[key] = {
                  startX: centerCoordinates[source].x + r * Math.cos(angle),
                  startY: centerCoordinates[source].y + r * Math.sin(angle),
                  endX: centerCoordinates[target].x - r * Math.cos(angle),
                  endY: centerCoordinates[target].y - r * Math.sin(angle),
                  detourX: centerCoordinates[target].x - r * Math.cos(angle),
                  detourY: centerCoordinates[target].y - r * Math.sin(angle),
                };
              }
            }
          });
        }
      }
    }

    // Loop over the commands to generate SVG content
    const svgList = Object.entries(lines).map(
      ([key, line]) => html`${this.writeCircleAndStraightLine(key, line)}`,
    );

    // Function to render the list of SVGs
    function renderSVGs(): TemplateResult {
      return html`${svgList}`;
    }

    //Compute the bubbles first, as their write functions set the disabledEntities,
    //which the writeCircleAndStraightLine functions in renderSVGs relies on

    const gridContainer = html`
      <div class="grid_container">
        <div class="pv_0">${this.writePvIconBubble(0)}</div>
        <div class="pv_1">${this.writePvIconBubble(1)}</div>
        <div class="battery">${this.writeBatteryIconBubble()}</div>
        <div class="inverter_0">${this.writeInverterIconBubble(0)}</div>
        <div class="inverter_1">${this.writeInverterIconBubble(1)}</div>
        <div class="ev_0">${this.writeNodeIconBubble('ev', 0)}</div>
        <div class="ev_1">${this.writeNodeIconBubble('ev', 1)}</div>
        <div class="grid">${this.writeGridIconBubble()}</div>
        <div class="building_0">${this.writeBuildingIconBubble(0)}</div>
        <div class="ev_2">${this.writeNodeIconBubble('ev', 2)}</div>
        <div class="appliance_0">
          ${this.writeNodeIconBubble('appliance', 0)}
        </div>
        <div class="building_1">${this.writeBuildingIconBubble(1)}</div>
        <div class="building_2">${this.writeBuildingIconBubble(2)}</div>
        <div class="appliance_1">
          ${this.writeNodeIconBubble('appliance', 1)}
        </div>
        <div class="appliance_2">
          ${this.writeNodeIconBubble('appliance', 2)}
        </div>
        <div class="building_3">${this.writeBuildingIconBubble(3)}</div>
        <div class="appliance_3">
          ${this.writeNodeIconBubble('appliance', 3)}
        </div>
        <div class="appliance_4">
          ${this.writeNodeIconBubble('appliance', 4)}
        </div>
      </div>
    `;

    return html`
      <ha-card .header=${this.config.name} tabindex="0">
        <div id="power-card">
          <div
            class="power_lines"
            style="
                height:100%;
                width:100%;
                top:0px;
                left:0px;
                padding:10px;
                z-index: 2;
                position: absolute;"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="${'0 0 ' + svgViewWidth + ' ' + svgViewHeight}"
              preserveAspectRatio="xMinYMax slice"
              style="height:${svgViewHeight + 'px'};width:${svgViewWidth +
              'px'}"
            >
              ${renderSVGs()}
            </svg>
          </div>
          ${gridContainer}
        </div>
      </ha-card>
    `;
  }

  private writePvIconBubble(pvNumber: number): TemplateResult {
    let pvEntities = [];

    if (pvNumber === 0) {
      pvEntities = [
        'pv' + pvNumber + '_to_inverter' + pvNumber + '_entity',
        'pv' + pvNumber + '_to_battery_entity',
      ];
    } else {
      pvEntities = ['pv' + pvNumber + '_to_inverter' + pvNumber + '_entity'];
    }

    const bubbleData: BubbleData = this.calculateIconBubbleData(
      pvEntities,
      this.colorMapping['pv'],
      'pv' + pvNumber + '_entity',
      'pv' + pvNumber + '_extra_entity',
    );

    bubbleData.icon = this.config['pv' + pvNumber + '_icon'];

    if (
      bubbleData.mainUnitOfMeasurement === 'W' &&
      Math.abs(bubbleData.mainValue) < 25
    ) {
      bubbleData.disabled = true;
    }

    if (bubbleData.disabled) {
      this.disabledEntities.add('pv' + pvNumber);
    } else {
      this.disabledEntities.delete('pv' + pvNumber);
    }

    return this.writeBubbleDiv(bubbleData);
  }

  private writeInverterIconBubble(inverterNumber: number): TemplateResult {
    let inverterEntities = [];

    if (inverterNumber === 0) {
      inverterEntities = [
        'inverter' + inverterNumber + '_to_grid_entity',
        'inverter' + inverterNumber + '_to_building1_entity',
        '-inverter1_to_inverter' + inverterNumber + '_entity',
        '-grid_to_inverter' + inverterNumber + '_entity',
      ];
    } else {
      inverterEntities = [
        'inverter' + inverterNumber + '_to_grid_entity',
        'inverter' + inverterNumber + '_to_building1_entity',
        'inverter' + inverterNumber + '_to_inverter0_entity',
      ];
    }

    const bubbleData: BubbleData = this.calculateIconBubbleData(
      inverterEntities,
      this.colorMapping['inverter'],
      'inverter' + inverterNumber + '_entity',
      'inverter' + inverterNumber + '_extra_entity',
    );

    bubbleData.icon = this.config['inverter' + inverterNumber + '_icon'];

    if (
      bubbleData.mainUnitOfMeasurement === 'W' &&
      Math.abs(bubbleData.mainValue) < 25
    ) {
      bubbleData.disabled = true;
    }

    if (bubbleData.disabled) {
      this.disabledEntities.add('inverter' + inverterNumber);
    } else {
      this.disabledEntities.delete('inverter' + inverterNumber);
    }

    return this.writeBubbleDiv(bubbleData);
  }

  private writeGridIconBubble(): TemplateResult {
    const gridEntities = [
      '-inverter0_to_grid_entity',
      '-inverter1_to_grid_entity',
      'grid_to_building1_entity',
      'grid_to_inverter0_entity',
    ];

    const bubbleData: BubbleData = this.calculateIconBubbleData(
      gridEntities,
      this.colorMapping['grid'],
      'grid_entity',
      'grid_extra_entity',
    );

    bubbleData.icon = this.config.grid_icon;

    if (
      bubbleData.mainUnitOfMeasurement === 'W' &&
      Math.abs(bubbleData.mainValue) < 100
    ) {
      bubbleData.disabled = true;
    }

    if (bubbleData.disabled) {
      this.disabledEntities.add('grid');
    } else {
      this.disabledEntities.delete('grid');
    }

    return this.writeBubbleDiv(bubbleData);
  }

  private writeBuildingIconBubble(buildingNumber: number): TemplateResult {
    let buildingEntities = [];

    if (buildingNumber === 1) {
      buildingEntities = [
        'inverter0_to_building' + buildingNumber + '_entity',
        'inverter1_to_building' + buildingNumber + '_entity',
        'grid_to_building' + buildingNumber + '_entity',
      ];
    } else {
      buildingEntities = ['building1_to_building' + buildingNumber + '_entity'];
    }

    const bubbleData: BubbleData = this.calculateIconBubbleData(
      buildingEntities,
      this.colorMapping['building'],
      'building' + buildingNumber + '_entity',
      'building' + buildingNumber + '_extra_entity',
    );

    bubbleData.icon = this.config['building' + buildingNumber + '_icon'];

    if (bubbleData.disabled) {
      this.disabledEntities.add('building' + buildingNumber);
    } else {
      this.disabledEntities.delete('building' + buildingNumber);
    }

    return this.writeBubbleDiv(bubbleData);
  }

  private writeBatteryIconBubble(): TemplateResult {
    const batteryEntities = [
      'inverter0_to_battery_entity',
      'pv0_to_battery_entity',
      '-battery_to_inverter0_entity',
    ];
    const bubbleData: BubbleData = this.calculateIconBubbleData(
      batteryEntities,
      this.colorMapping['battery'],
      'battery_entity',
      'battery_extra_entity',
    );

    bubbleData.icon = this.config.battery_icon;

    if (
      bubbleData.mainUnitOfMeasurement === 'W' &&
      Math.abs(bubbleData.mainValue) < 25
    ) {
      bubbleData.disabled = true;
    }

    if (bubbleData.disabled) {
      this.disabledEntities.add('battery');
    } else {
      this.disabledEntities.delete('battery');
    }

    return this.writeBubbleDiv(bubbleData);
  }

  private writeNodeIconBubble(
    nodeName: string,
    nodeNumber: number,
  ): TemplateResult {
    for (let buildingNumber = 0; buildingNumber < 4; buildingNumber++) {
      const entityName =
        'building' +
        buildingNumber +
        '_to_' +
        nodeName +
        nodeNumber +
        '_entity';

      if (entityName in this.config) {
        const nodeEntities = [entityName];

        const bubbleData: BubbleData = this.calculateIconBubbleData(
          nodeEntities,
          this.colorMapping[nodeName],
          entityName,
          nodeName + nodeNumber + '_extra_entity',
        );

        bubbleData.icon = this.config[nodeName + nodeNumber + '_icon'];

        if (
          bubbleData.mainUnitOfMeasurement === 'W' &&
          bubbleData.mainValue <= 5
        ) {
          bubbleData.disabled = true;
        }

        if (bubbleData.disabled) {
          this.disabledEntities.add(nodeName + nodeNumber);
        } else {
          this.disabledEntities.delete(nodeName + nodeNumber);
        }

        return this.writeBubbleDiv(bubbleData);
      }
    }

    return html``;
  }

  private isValueNaN(value: string | number | undefined): boolean {
    if (value === undefined) {
      return true;
    }

    if (typeof value === 'string') {
      return value.trim().toLowerCase() === 'nan';
    }
    return Number.isNaN(value);
  }

  private calculateIconBubbleData(
    entitiesForMainValue: Array<string>,
    bubbleColor: string,
    bubbleClickEntitySlot: string | null = null,
    extraEntitySlot: string | null = null,
  ): BubbleData {
    const bubbleData = new BubbleData();
    bubbleData.clickEntitySlot = bubbleClickEntitySlot;
    bubbleData.color = bubbleColor;

    entitiesForMainValue.forEach((entityHolder: string) => {
      let isSubstractionEntity = false;

      if (entityHolder.substring(0, 1) === '-') {
        entityHolder = entityHolder.substring(1);
        isSubstractionEntity = true;
      }

      const cardElement = this.cardElements.get(entityHolder);

      if (cardElement !== null && cardElement?.value !== undefined) {
        bubbleData.noEntitiesWithValueFound = false;
        bubbleData.mainValue = isSubstractionEntity
          ? bubbleData.mainValue - cardElement?.value
          : bubbleData.mainValue + cardElement?.value;
        bubbleData.mainUnitOfMeasurement = cardElement?.unitOfMeasurement;
      }
    });

    if (extraEntitySlot !== null) {
      const extraEntity = this.cardElements.get(extraEntitySlot);
      bubbleData.extraValue = extraEntity?.value;
      bubbleData.extraUnitOfMeasurement = extraEntity?.unitOfMeasurement;

      if (bubbleData.extraValue == 'unknown') {
        bubbleData.extraValue = '';
        bubbleData.extraUnitOfMeasurement = '';
      } else if (
        bubbleData.extraUnitOfMeasurement == '' &&
        bubbleData.extraValue == '0'
      ) {
        bubbleData.extraValue = extraEntity?.entity;
      } else {
        if (bubbleData.extraUnitOfMeasurement === 'kWh') {
          let numericExtraValue = parseFloat(bubbleData.extraValue || '0');

          //Round to 1 decimal place if less than 10 kWh
          if (Math.abs(numericExtraValue) < 10) {
            numericExtraValue = Math.round(numericExtraValue * 10) / 10;
          } else {
            numericExtraValue = Math.round(numericExtraValue);
          }

          bubbleData.extraValue = numericExtraValue.toString();
        } else if (bubbleData.extraUnitOfMeasurement === 'Wh') {
          let numericExtraValue =
            parseFloat(bubbleData.extraValue || '0') / 1000.0;

          //Round to 1 decimal place if less than 10 kWh
          if (Math.abs(numericExtraValue) < 10) {
            numericExtraValue = Math.round(numericExtraValue * 10) / 10;
          } else {
            numericExtraValue = Math.round(numericExtraValue);
          }

          bubbleData.extraValue = numericExtraValue.toString();
          bubbleData.extraUnitOfMeasurement = 'kWh';
        }
      }

      if (this.isValueNaN(bubbleData.extraValue)) {
        bubbleData.extraValue = '0';
      }
    }

    if (bubbleClickEntitySlot !== null) {
      bubbleData.clickEntityHassState =
        this.hass.states[this.config[bubbleClickEntitySlot]];
    }

    if (Math.abs(bubbleData.mainValue) <= 100) {
      bubbleData.mainUnitOfMeasurement = 'W';
    } else {
      bubbleData.mainUnitOfMeasurement = 'kW';
      // Set mainValue to kW with a single decimal place
      bubbleData.mainValue =
        Math.round((bubbleData.mainValue / 1000) * 10) / 10;
    }

    if (this.isValueNaN(bubbleData.mainValue)) {
      bubbleData.mainValue = 0;
    }

    if (bubbleData.mainValue == 0 && this.config.hide_inactive_entities) {
      bubbleData.disabled = true;
    }

    return bubbleData;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private animateCircles(obj: any) {
    requestAnimationFrame(timestamp => {
      obj.updateAllCircles(timestamp);
    });
  }

  public updateAllCircles(timestamp: number): void {
    this.cardElements.forEach((_, key) => {
      const element = this.cardElements.get(key);
      if (element !== undefined) this.updateOneCircle(timestamp, element);
    });
  }

  private updateOneCircle(timestamp: number, entity: SensorElement) {
    if (this.shadowRoot == null) return;

    const powerCardElement = <HTMLElement>(
      this.shadowRoot.querySelector('#power-card')
    );

    if (powerCardElement == null) return;

    entity.line = <SVGPathElement>(
      powerCardElement.querySelector('#' + entity.entitySlot + '_line')
    );

    if (entity.line === null) return;

    if (entity.lineLength === null) {
      const lineLength = entity.line.getTotalLength();
      if (isNaN(lineLength)) return;
      entity.lineLength = lineLength;
    }

    entity.circle = <SVGPathElement>(
      powerCardElement.querySelector('#' + entity.entitySlot + '_circle')
    );

    if (entity.circle === null) return;

    let isEntityDisabled = false;

    for (const disabledEntity of this.disabledEntities) {
      if (entity.entitySlot.includes(disabledEntity)) {
        entity.circle.setAttribute('visibility', 'hidden');
        if (this.config.hide_inactive_entities && entity.line) {
          entity.line.setAttribute('visibility', 'hidden');
        }
        isEntityDisabled = true;
        break;
      }
    }

    if (isEntityDisabled || entity.speed === 0 || !entity.spuriousValue()) {
      entity.circle.setAttribute('visibility', 'hidden');
      if (this.config.hide_inactive_entities) {
        entity.line.setAttribute('visibility', 'hidden');
      }
      return;
    }

    entity.circle.setAttribute('visibility', 'visible');
    entity.line.setAttribute('visibility', 'visible');

    if (entity.prevTimestamp === 0) {
      entity.prevTimestamp = timestamp;
      entity.currentDelta = 0;
    }

    entity.currentDelta +=
      Math.abs(entity.speed) * (timestamp - entity.prevTimestamp);

    let percentageDelta = entity.currentDelta / entity.lineLength;

    if (entity.speed > 0) {
      if (percentageDelta >= 1 || isNaN(percentageDelta)) {
        entity.currentDelta = 0;
        percentageDelta = 0.01;
      }
    } else {
      percentageDelta = 1 - percentageDelta;
      if (percentageDelta <= 0 || isNaN(percentageDelta)) {
        entity.currentDelta = 0;
        percentageDelta = 1;
      }
    }

    const point = entity.line.getPointAtLength(
      entity.lineLength * percentageDelta,
    );

    entity.circle.setAttributeNS(null, 'cx', point.x.toString());
    entity.circle.setAttributeNS(null, 'cy', point.y.toString());

    const interpolatedR = Math.round(
      entity.sourceR + percentageDelta * (entity.destR - entity.sourceR),
    )
      .toString(16)
      .padStart(2, '0');
    const interpolatedG = Math.round(
      entity.sourceG + percentageDelta * (entity.destG - entity.sourceG),
    )
      .toString(16)
      .padStart(2, '0');
    const interpolatedB = Math.round(
      entity.sourceB + percentageDelta * (entity.destB - entity.sourceB),
    )
      .toString(16)
      .padStart(2, '0');

    entity.circle.setAttributeNS(
      null,
      'fill',
      '#' + interpolatedR + interpolatedG + interpolatedB,
    );

    entity.prevTimestamp = timestamp;
  }

  private redraw(ev: UIEvent) {
    if (this.hass && this.config && ev.type === 'resize') {
      this.oldWidth = this.changeStylesDependingOnWidth(
        this.clientWidth,
        this.oldWidth,
      );
    }
  }

  static get styles(): CSSResult {
    return css`
      #power-card {
        margin: auto;
        display: table;
        padding: 10px;
        position: relative;
      }
      .acc_container {
        height: 40px;
        width: 40px;
        border: 1px solid black;
        border-radius: 50%;
        padding: 22px;
        margin: auto;
        position: relative;
        cursor: pointer;
      }
      .acc_icon {
        --mdc-icon-size: 40px;
      }
      .acc_text,
      .acc_text_extra {
        text-align: center;
        white-space: nowrap;
      }
      .acc_text_extra {
        overflow: hidden;
        position: absolute;
      }

      br.clear {
        clear: both;
      }

      .grid_container {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        grid-template-rows: 1fr 1fr 1fr 1fr 1fr;
        gap: 10px 10px;
        grid-auto-flow: row;
        z-index: 2;
        position: relative;
        grid-template-areas:
          '. pv_0 pv_1 .'
          'battery inverter_0 inverter_1 ev_0'
          'ev_1 grid building_0 ev_2'
          'appliance_0 building_1 building_2 appliance_1'
          'appliance_2 building_3 appliance_3 appliance_4';
      }

      .pv_0 {
        grid-area: pv_0;
      }

      .pv_1 {
        grid-area: pv_1;
      }

      .battery {
        grid-area: battery;
      }

      .inverter_0 {
        grid-area: inverter_0;
      }

      .inverter_1 {
        grid-area: inverter_1;
      }

      .ev_0 {
        grid-area: ev_0;
      }

      .ev_1 {
        grid-area: ev_1;
      }

      .grid {
        grid-area: grid;
      }

      .building_0 {
        grid-area: building_0;
      }

      .ev_2 {
        grid-area: ev_2;
      }

      .appliance_0 {
        grid-area: appliance_0;
      }

      .building_1 {
        grid-area: building_1;
      }

      .building_2 {
        grid-area: building_2;
      }

      .appliance_1 {
        grid-area: appliance_1;
      }

      .appliance_2 {
        grid-area: appliance_2;
      }

      .building_3 {
        grid-area: building_3;
      }

      .appliance_3 {
        grid-area: appliance_3;
      }

      .appliance_4 {
        grid-area: appliance_4;
      }
    `;
  }
}
