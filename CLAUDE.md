# yet-another-power-card

Custom Home Assistant Lovelace card for real-time power flow visualization.

## Architecture

LitElement web component (TypeScript + Lit 2) built with Rollup. Single entry point `power-card.ts` registers the `<power-card>` custom element. Main logic in `src/PowerCard.ts` (~1500 lines).

- **CSS Grid layout** — 4x5 grid (8 physical columns, items span 2) with 4 PV arrays offset in top row
- **SVG overlay** — animated circles flow along gradient lines between nodes, driven by `setInterval` at 15ms
- **Configurable nodes** — PV arrays (4), inverters (2), battery, grid, buildings (4), appliances (5), EVs (3)

## Build & Deploy

```bash
npm run build                    # tsc + rollup → power-card.js (IIFE bundle)
./deploy.sh                      # lint + build + cp to ~/config/www/
# or manually:
docker exec homeassistant cp /home/thomas/workspace/yet-another-power-card/power-card.js /config/www/power-card.js
```

Hard refresh browser (Ctrl+Shift+R) to pick up changes. No HA restart needed.

## Grid Layout

```
pv_2(west)   pv_1(east)   pv_0(south-L)  pv_3(south-R)
inverter_1   inverter_0   battery         ev_0
ev_1         grid         building_0      ev_2
appliance_0  building_1   building_2      appliance_1
appliance_2  building_3   appliance_3     appliance_4
```

PV row uses 8-column offset: each item spans 2 columns, PVs shifted by 1 column so they sit centered between the pair below.

## Key Config Fields

Each node has `_entity` (power sensor), `_extra_entity` (secondary display), `_icon`, and `_to_` flow entities for animated lines. Special cases:
- `pv2_to_inverter1` — west PV to SolarEdge inverter
- `pv3_to_inverter0` + `pv3_to_battery` — south right string to Solax inverter/battery
- `inverter0_to_building1` — detour line routing right via grid/building_0 midpoint
- `pv3_to_inverter0` — 2-point detour with symmetric angle at bend

## Thresholds

- PV bubbles: disabled below 10W
- Inverter/battery: disabled below 25W
- Grid: disabled below 100W
- Appliance/EV: disabled below 10W

## Known Issues

- `setInterval` in `setConfig` is never cleared in `disconnectedCallback` — accumulates timers on dashboard navigation. Attempted fix broke SVG line rendering; needs separate investigation.
- `resize` event listener not removed on disconnect — same root cause.
