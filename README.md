# ElectroSim – Electrical Simulator

Browser-based electrical and industrial automation simulator (HTML, CSS, JavaScript – no build step).

## Run
Open `index.html`, or serve the folder (`python3 -m http.server`). GitHub Pages: Settings → Pages → `main` / root.

## PLC ladder editor – TIA Portal style (v8.21)
Double-click a PLC. The editor now has the layout of Siemens TIA Portal:
- **Project tree (left)** – *Main [OB1]* (the ladder), *Tag table* (name every I / Q / M / T / C / AI / AO address, filter, see where it is used) and *Device configuration* (DI / DO / AI / AO counts, signal types, RUN / STOP).
- **Instructions task card (right)** – *Bit logic* (NO, NC, coil, SET, RESET), *Comparator* (== <> > >= < <=), *Timers* (TON), *Counters* (CTU), *Move*. **Drag** an instruction onto the network: the free places light up, the nearest one turns solid, release to drop. Drop on the bottom edge of a contact to make a **parallel branch**. Click an instruction to add it after the selected element instead.
- **Networks (centre)** – numbered *Network n* with title and comment, collapse arrow, move / duplicate / delete, and **＋ Insert network** between networks. **Drag a placed element** to move it (also to another network). TON / CTU are drawn as boxes with IN / Q pins and a live value.
- **Properties (bottom)**, **Watch & force table** (click an input to force it, drag an analog input), **Undo / Redo** (Ctrl+Z / Ctrl+Y), zoom 75 – 150 %. On a phone the panes stack and the instructions become a scrolling strip.

## Install as an app (v8.21)
Settings (⚙) or ⋯ → **⬇ Download app** installs ElectroSim as a stand-alone window (no address bar, works offline). It must be opened from `https://` or `localhost`, not from a file.

## Busbars and HMI (v8.15)
- **Busbars** (*Connection*): **Earth bar (PE)**, **Neutral bar (N)**, **Phase bar (L1/L2/L3)**, **+24 V DC bar**, **0 V DC bar**. All terminals of a bar are one electrical point, on a top and a bottom row. Choose 4 – 16 terminals per row in Properties (wires on removed terminals are deleted); the phase bar has an L1 / L2 / L3 choice that sets its colour. Wire every PE to the earth bar, every neutral to the neutral bar, and so on.
- **HMI panel** (*Automation*) – a touch-screen linked to a PLC **by address, no wires**. Since v8.18 it has its own **HMI Designer**, with several screens and alarms since v8.19 (see below); the part on the sheet shows a live miniature of the screen.

## HMI Designer (v8.18 phase 1, v8.19 phase 2, v8.20 phase 3)
Double-click an HMI panel on the sheet (or select it and press **✎ Open HMI designer** in Properties). Like the PLC ladder editor it opens in its own window:
- **Screens (left, top)** – the list of screens of the panel. **＋ Screen** adds one, **＋ Alarms** adds an *alarm screen*, **⧉** duplicates, **▲ ▼** reorder, **🗑** deletes (a panel keeps at least one screen). **Double-click** a name to rename it. The first screen (⌂) is the **home** screen. Panel size is the same for all screens; the background is per screen.
- **Palette (left)** – *Push button, Toggle switch, Lamp, Numeric display, Bar graph, Text, Panel, Navigation*, and since v8.20 the *Process symbols* and *Trend*. Click one to add it, then drag it into place.
- **Canvas (centre)** – the screen with grid and snap. Click to select, drag to move, drag the blue corner handle to resize, arrow keys nudge (Shift = 8 px), **Del** deletes, **Ctrl+D** duplicates. Zoom with − / + / Fit. Widget positions are measured from the top of the area *under the header bar*.
- **Inspector (right)** – for a widget: PLC address (with a list of the addresses and tag names of the linked PLC), text, colour, font size, decimals, bar min / max, position and size, front / back. With nothing selected: screen name, panel size, background, linked PLC, grid options, **Header bar**, **Alarms** and a **Checks** list (missing PLC, unknown address, a write to a bit the HMI cannot write, a navigation button without a target, an alarm on a missing bit, alarms without an alarm screen).
- **Design / Simulate** – *Simulate* makes the screens work like the real panel (start the simulation with ▶ Run; the PLC must be powered and in RUN). Push button = bit is 1 while held; Toggle switch = stays on / off; Lamp, Numeric display and Bar graph read Q / M / I bits, AI / AO (%), timers (s) and counters. Navigation, the alarm banner and the alarm list also work in Simulate without ▶ Run (alarms of course need the PLC running).
- The HMI writes only **I and M bits**. Use an M bit and a contact of the same address in the ladder, e.g. START = M0.0, STOP = M0.1, lamp = Q0.0: **[NO M0.0 or NO Q0.0] – [NC M0.1] – (Q0.0)**.

### Phase 2 – screens, navigation, header, alarms (v8.19)
- **Navigation button** (palette *Navigation*): *Action* = **Go to screen** (choose the *Target screen*), **Back** (the previous screen, up to 20 steps) or **Home** (first screen in the list). On the sheet and in Simulate it works with a tap. Stop resets the panel to the home screen.
- **Header bar** – shown on every screen: title (default = the part label), the **current screen name**, **date and time**, and an accent colour. Switch it off or choose its parts in the inspector (*Header bar*).
- **Alarms** – define them in the inspector (*Alarms → ＋ Add alarm*): **PLC bit** (I, Q, M bit, timer or counter), **priority** and **text**. When the bit turns **on** the alarm is raised with its time. Priority colours: **Critical = red**, **Warning = amber**, **Info = blue**.
  - **Alarm screen** (**＋ Alarms**): header, an **ACTIVE** tab and a **HISTORY** tab, **ACK** per alarm, **ACK ALL** and ▲ ▼ page buttons. A new alarm screen comes with a **BACK** navigation button; the strip under the list is left free for your own buttons. In Design mode it shows sample rows so you can see the layout.
  - **Life of an alarm:** on → *ACTIVE* (flashes until acknowledged) → ACK → *ACKED* → when the bit goes off it moves to the **history** (ON, ACK and OFF times). If the bit goes off before it was acknowledged it stays in the active list as *CLEARED* until you press ACK. A bit that turns on again raises a new alarm. The history keeps the latest 200.
  - Alarm times are the computer clock. Alarms, history and the current screen are cleared when you press ■ Stop.
- **Alarm banner** – a strip at the bottom of **every screen** (except the alarm screen) showing the **newest** alarm with its time, priority colour, an **ACK** button and “+n more”; it flashes until acknowledged. **Tap the banner to open the alarm screen** (or to acknowledge it if the panel has no alarm screen). With no alarm it shows “No active alarms”. Switch it off in the inspector (*Alarms → Banner*).
- Panels saved with v8.18 open normally: they get the header and banner, and widgets are squeezed into the new content area if they were placed low on the screen. Panels saved with v8.15 – v8.17 are converted automatically (their 1 – 8 widgets become widgets on the first screen).
- Limits: alarm bits are read once per PLC scan (before the ladder), so an alarm shows one scan after the ladder sets the bit. Alarm text is fixed (no values inserted yet) – planned for phase 4 with the tag table.
- Roadmap: phase 4 tag table, numeric entry, PDF export of the screens.
- Code: runtime and drawing in `js/hmi.js`, designer in `js/hmid.js`, process graphics in `js/hmip.js` (header comments explain the data model and how to add a widget kind).

### Phase 3 – process graphics and animation (v8.20)
Example: `examples/hmi_process_graphics.json` (Menu ⋯ → *Open project file…*, press ▶ Run, then **START** on the HMI; the tank fills while the pump runs, the **FAULT** switch trips the pump).
- **Process symbols** (designer palette, *Process symbols*): **Tank** (level), **Pump**, **Valve**, **Motor**, **Fan**, **Pipe**, **Conveyor**, **Tower lamp**, **Gauge** and **Meter**. Pick the *Symbol* in the inspector at any time; size them by dragging the corner handle. The text under a symbol is its label.
  - **Tank, Gauge, Meter** show a *value*: AI / AO (%), a timer (s), a counter. *Min* / *Max* set the range. Tank fill, gauge needle and meter needle move smoothly.
  - **Pump, Motor, Fan, Conveyor** take a *Running bit* and an optional *Fault bit*: running = the widget colour, off = grey, fault = **red, flashing** and the symbol stops. Impellers, rotors and blades spin up and down; the conveyor belt and its boxes move. *Speed* is in deg/s (px/s for belt and pipe).
  - **Valve** takes an *Open bit* (or a position in AI / AO %, shown as a number) and an optional fault bit. **Pipe** takes a *Flow bit* (or an AI / AO flow): the fluid colour and moving dashes show the flow; *Flow direction* is left→right / top→bottom or reverse; make the pipe long and thin (width > height = horizontal, otherwise vertical).
  - **Tower lamp**: red, amber and green lamp bits, each *Steady*, *Flashing (slow)* or *Flashing (fast)*.
- **Animation rules (any widget)** – inspector → *Animation* → choose a type → **＋ Add**; give the rule a PLC address (bit, AI, AO, timer, counter). A rule is *on* when the bit is 1, a timer / counter is done / non-zero, or an analog value is above 0. Rules run in order and a later colour rule wins.
  - **Colour** – colour when ON / when OFF, e.g. rule 1: `Q0.0` ON = Green, OFF = Grey; rule 2: `M0.2` ON = Red, OFF = no change → green when running, red when faulted.
  - **Blinking** – slow (1 Hz) or fast (2 Hz) while ON. **Visibility** – show when ON or hide when ON.
  - **Fill level** – a coloured overlay fills the widget (up, down, left, right) between *Empty at* and *Full at*; **Rotation** – spins at a speed in deg/s while ON (an analog address gives a proportional speed; negative = reverse); **Movement** – the widget slides by X / Y px as the value goes from *At value* to *… to value* (a bit moves it fully or not at all).
- **Limits (colours)** – numeric display, bar graph, tank, gauge, meter and trend have *Low alarm*, *Low warning*, *High warning*, *High alarm*. The value turns **amber** at a warning limit and **red** at an alarm limit (value at or beyond it); *Blink at an alarm* is optional. Bars and tanks show limit marks, gauges and meters show coloured zones, the trend draws dashed limit lines. Limits are in the unit of the value (%, s, count).
- **Trend chart** (palette *Trend*): up to **4 pens** (any bit, AI, AO, timer or counter), *Time span* 10 s … 1 h, *Y min / Y max* (empty = automatic). One point every 0.1 s of simulation time, kept for the whole run (cleared by ■ Stop). On the real panel and in **Simulate**: **− / +** change the time scale, **pause** freezes the view (the recording goes on), and while paused **‹ ›** scroll back in time. Bits are drawn as on / off lines; the legend shows the live values and tag names.
- Design tab: symbols show sample values (a 62 % tank, a green lamp) and rules are not applied, so everything stays visible while editing; use **Simulate** + ▶ Run to see the animation. *Checks* now also report missing / unknown addresses in symbols, rules and pens, and limits in the wrong order.
- Limits of this phase: values are shown in the unit of the PLC value (no engineering-unit scaling yet – phase 4 with the tag table); trend history is not saved with the project.


## Wire drawing (v8.15) – click-to-place corners
- **Click a terminal** to start a wire. **Click anywhere on the sheet** to fix a corner there – the wire stays on a horizontal / vertical line from the previous point and snaps to the grid (a blue dot shows where the next corner will go). Keep clicking to add corners. The wire is **finished only when you click another terminal**.
- **Backspace** removes the last corner, **Esc** or **right-click** cancels the wire. Dragging on empty space still pans the sheet, and pinch-zoom no longer cancels a wire in progress.
- Clicking a terminal straight away (no corners) still gives the old automatic route, and drag-from-terminal-to-terminal still works.
- **Edit later:** select a wire to see a handle on every corner – **drag** a handle to move the corner, **double-click** it to remove it. Corners are saved with the project.

## What's new (v8.9) – one multi-function meter, type chosen in Properties
- The three separate meters in the *Instruments* library (direct, CT operated, CT + PT operated) were hard to tell apart, so there is now **one "Multi-function meter (MFM)"** component. Pick the **Meter type** in Properties: **Direct**, **CT operated (/5 A or /1 A)** or **CT + PT operated**.
- The type changes everything that should differ: terminal names (**IN / OUT** → **S1 / S2 (CT secondary)**, **V1…** → **(PT secondary)**), the properties shown (rated current; CT primary / secondary; PT primary / secondary), the symbol (grey / amber / green body, display title and a side tag with the rating or ratios), the Help diagram, the warnings and the parts list.
- Wires stay connected when you change the type (the terminal positions are the same).
- Projects saved with v8.8 (separate CT / CT + PT meters) are converted automatically when opened; the two example files were updated.
- **Tower Light (stack light)** (*Loads*): a signal tower with **1 to 5 lamps (red, amber, green, blue, white)** and an optional **buzzer**, one **COM** terminal. Set the *Number of lamps* and *Buzzer* in Properties: only the terminals in use are shown (**R, A, G, B, W, BZ**, listed top to bottom like the real tower) and wires stay connected when you change them. Each lamp lights with its own power (rated voltage and power per lamp are set in Properties), so you can drive each colour from a contactor, relay contact or PLC output. Warns on overvoltage.
- **Fused Terminal (blown-fuse LED)** (*Protection*): a DIN-rail fuse terminal block. Supply on **1**, load on **2**. It blows above its rating like the normal fuse (**Replace fuse** in Properties) and a **red LED** lights when the fuse is blown and there is voltage across it, as on the real terminal. Set the *Fuse rating* and the *LED rated voltage*.
- **Panel Exhaust Fan** (*Motors & Drives*): an axial cooling / exhaust fan for a control panel, AC (230 V) or DC (24 V), 80 to 172 mm. The blades spin up and down with the power it gets, the speed and air flow follow the voltage (an undervoltage warning appears when it runs slow), and an overvoltage warns. Put a **Thermostat** in series to start it only when the panel is hot.
- **Pressure Switch – mechanical, 1 set point** and **Pressure Switch – mechanical, 2 set points** (*Valves & Actuators*) – **stand-alone since v8.15: no air line / AIR IN port any more.** You apply the pressure yourself: click the **−** / **+** buttons on the symbol (0.5 bar per click), use the buttons in Properties (0 bar, trigger, reset, ±0.5, ±1, max), or type a value in *Pressure applied*. Both have a changeover contact: **COM–NC** at rest, **COM–NO** when actuated, and a dial with the set-point marks.
  - **1 set point:** actuates when the pressure rises to the *Set point*, returns at *set point − Differential*.
  - **2 set points** (*ON point* / *OFF point*, e.g. 2 bar and 5 bar): *Action = Pump* – actuates when the pressure falls to the ON point (2 bar) and releases when it rises to the OFF point (5 bar), holding its state in between (compressor / pump control); *Action = Window* – actuated only from the ON point up to the OFF point. Warns if OFF ≤ ON.
  - Old sheets: the 1-set-point switch keeps the same part name; its old air wire is dropped when the sheet is opened. The older *Pressure Switch* in *Switching* is a plain manual switch and is unchanged.

## What's new (v8.8) – CT and PT: instrument transformers and the meters that use them
- **Current transformer (CT)** (*Instruments*): the line passes through **P1 → P2**; **S1 / S2** give the secondary current (**1 A or 5 A**, ratio set in Properties). The secondary keeps the phase angle, so kW / kVAr / PF stay correct. An **open secondary** raises a danger error with the voltage that would appear; primary above rating warns.
- **Voltage transformer (PT / VT)**: primary **A / N**, secondary **a / n** (default 6351 V → 63.5 V; rated burden in VA is checked). Keeps the voltage angle and frequency.
- **Multi-function meter, Meter type = CT operated / CT + PT operated** (v8.8 had these as separate parts; since v8.9 they are one part): the current terminals are the CT secondary inputs (**I1 / I2 / I3 S1 / S2**), and for the CT + PT type the voltage terminals take the PT secondaries. Set the **CT primary / secondary** (and **PT primary / secondary**) in the meter: it shows the *primary* values. A wrong ratio gives wrong readings, S1 / S2 swapped gives reverse power, and a secondary input above range warns. Single-phase wiring and the energy counters work as on the direct meter.
- Solver: current sources can now carry an imaginary part (`ii`), which is how a CT keeps the phase angle.
- Examples: `examples/mfm_ct_operated.json` (400 V, CT 100/5) and `examples/mfm_ct_pt_operated.json` (11 kV, CT 50/5, PT 6351/63.5 V).

## What's new (v8.7) – multi-function meter (MFM)
- **Multi-function meter** (*Instruments*): a panel power / energy meter. Wire each phase **through** it (supply → **I1 / I2 / I3 IN**, **OUT** → load) and tap **V1 / V2 / V3 / N** for the voltage. Measures **V (L-N and L-L), I, P (kW), Q (kVAr), S (kVA), power factor, frequency and energy (kWh import / export, kVArh, kVAh)**, per phase and total.
- Paged LCD on the symbol (click it, or ◀ ▶, to change page); the full readings table is in Properties. **Reset energy** button; *Energy clock speed* (3600 = one simulated second counts as one hour).
- Works on DC, single-phase and three-phase AC (3- or 4-wire; with N open it forms a virtual star point). *Wiring = Single-phase* hides the unused terminals. Warnings: current above the direct rating, current with no voltage reference, reverse power.
- Calculated from the solver's complex phasors: P = Re(V·I*), Q = Im(V·I*), S = √(P²+Q²), PF = P/S (`js/mfm.js`).

## What's new (v8.6) – electric modulating valve, bigger ZSO / ZSC, smaller valves
- **Electric modulating valve** (*Valves & Actuators*): a motorised control-valve actuator – **no air, no single / double acting**. Supply **L+ / N** (24 V) and a **Control type** you pick in Properties, as on real Belimo / Danfoss AME / Siemens / Honeywell actuators:
  - **Modulating 0-10 V** – terminal **Y** (signal +, common = N): 0 V = closed, 10 V = open, anything between = that position.
  - **Modulating 2-10 V** – 2 V = closed, 10 V = open; below 1 V = wire break (valve closes).
  - **Modulating 4-20 mA** – 4 mA = closed, 20 mA = open (500 Ω input); below 3.6 mA = wire break.
  - **Open / Close (2-position)** – terminals **OPEN** and **CLOSE**: 24 V on OPEN drives fully open, 24 V on CLOSE fully closed, neither = holds.
  - **3-point floating** – OPEN / CLOSE terminals: runs only while energised and stops when the voltage is removed (pulses give part-way positions).
  - Terminals change with the control type (CLOSE and X are hidden when not needed), so old wires survive a change.
- Also: *If the power fails* (stay / spring return closed / spring return open), *Stroke time*, *Position at start*, optional **position feedback X** (0-10 V or 2-10 V that follows the real position), **ZSO / ZSC** limit-switch dry contacts (NO or NC), supply-voltage and signal warnings, and a ❓ Help button with a wiring diagram per control type. Works with PLC analogue outputs (0-10 V and 4-20 mA) and the signal injector. Code: `js/evalve.js`.
- **ZSO / ZSC boxes are bigger** (larger boxes, text and indicator dot) on the air-operated valves and the new electric valve.
- **Smaller valves:** the air-operated valves (single / double acting + limit switches) and the electric valve are now placed at **80 %** size (change *Size (%)* or drag the handle as usual). Valves already on a saved sheet keep their size. New part option `sc0` = default size of a part.
- Example: `examples/electric_modulating_valve.json` (Menu ⋯ → *Open project file…*).

## What's new (v8.4) – compressed air: CDA source → solenoid valve panel → actuator, with limit-switch feedback
- **CDA source** (*Valves & Actuators*): clean dry air at a set pressure, one **AIR OUT** port. Click it while running (or set *Air supply = Off*) to switch the air off.
- **Air lines.** Air ports (blue-ringed terminals) connect **only to other air ports**; tap one, then the other. An air line is drawn **blue with small tick marks**; it is pale when there is no pressure and bright with moving dashes when pressurised. Wires between an air port and an electrical terminal are refused. Select an air line to see its pressure.
- **Solenoid valve panel** now has an **air inlet P** and an **air outlet A1…An** per valve. Air passes P → An only while the valve is open (coil energised, or manual override); a closed valve vents its outlet to 0 bar. Old projects load unchanged.
- **Air-operated valve – single acting** (spring return) and **double acting** (ports A = open, B = close): driven only by the air on their ports (min. pressure and stroke time are settings), with **ZSO (open) and ZSC (closed) limit switches** as dry contacts (NO or NC) for feedback to a lamp or PLC input.
- **Control mode** (Properties of both air-operated valves): *On / Off (air only)*, *Modulating 0-10 V* or *Modulating 4-20 mA*. In a modulating mode the terminals **SIG + / SIG −** appear and the valve goes to the position given by the signal (0 V / 4 mA = closed, 10 V / 20 mA = open); the air port is then the positioner supply. 4-20 mA below 3.6 mA is a wire break (valve to 0 %). Works with the PLC analogue outputs and the signal injector.
- The air network is solved separately from the electrical network (`airSolve()` in `js/pneumatic.js`, called from `step()`). Results table shows air pressure; warnings for no air at P, low pressure, air on both sides of a double-acting piston.
- Example: `examples/cda_sov_actuator.json` (Menu ⋯ → *Open project file…*).
- The older all-in-one valves (*Actuated valve – single / double acting*, with their own pilot coil) are unchanged.

## What's new (v8) – configurable PLC I/O + friendlier ladder editor
- **Choose the I/O of the PLC.** Select the PLC and set **Digital inputs (0–16), Digital outputs (0–16), Analog inputs (0–8), Analog outputs (0–4)** in Properties – or pick a preset (8/8, 8/8 + 2 AI/1 AO, 16/16, 16/16 + 4 AI/2 AO, 4/4 micro). The symbol grows / shrinks and only the fitted terminals appear (`I0.0…I1.7`, `Q0.0…Q1.7`, `AI0…AI7`, `AO0…AO3`). Wires on terminals that disappear are removed (Undo brings them back). Old v7 projects load unchanged (8 DI / 8 DO).
- **Analog I/O is simulated.** AI and AO can each be **0–10 V** or **4–20 mA** (set in Properties). AI uses a 100 kΩ input (V) or 250 Ω shunt (mA); AO is a voltage source or a current source with 12 V compliance. Values are handled as 0–100 % of the span. Warnings: 4–20 mA wire break (< 3.6 mA), AO cannot drive its loop. Works with the Signal Injector, Potentiometer, level parts etc.
- **New ladder instructions:** **Compare** (`AI0 > 60`, also for timer seconds and counter values; operators > >= = <= < <>) and **MOVE → AO** (constant or copy of an AI).
- **Ladder editor, friendlier:** a *PLC setup* bar (change DI / DO / AI / AO counts, signal types and RUN / STOP without leaving the editor), **names / tags** for any address (shown on the rung, in the address lists and on the I/O strip), address lists that only offer fitted channels (and mark missing ones “not fitted”), **drag-to-force sliders for analog inputs**, live analog values in V / mA, **duplicate rung**, keyboard shortcuts (C NO · N NC · A compare · B branch · O OUT · S SET · R RST · T TON · U CTU · M MOVE · Del · Ctrl+D · +).
- **On the sheet:** clickable **RUN / STOP badge** on the PLC symbol, live LEDs for analog channels, an I/O map and wiring help in Properties, and a warning if the program uses an address the PLC does not have.
- **Transmitters (new library group, 21 parts):** pressure, differential pressure, temperature (RTD/TC), level, flow, weight / load cell, humidity, pH, conductivity, dissolved oxygen, turbidity, vibration, gas, speed, position, torque / force, density, current, voltage and power transducers, plus a *Universal* one with your own unit text. Enter the **process value** (any number, negative too), range low / high and the engineering unit in Properties – or use the 0-100 % / ± buttons, or the − / + buttons on the symbol while running. Output: **4-20 mA 2-wire loop powered** (needs ≥ 10 V, saturates at 3.8–20.5 mA) or **0-10 V 3-wire**; *Simulate sensor fault* gives burnout low / high so you can test the PLC's wire-break alarms. New file `js/transmitters.js` (add a row to `TXD` for another type).
- **Transmitter wiring selector + Help:** every transmitter now has *Transmitter type (wires)* in Properties – **2-wire** (loop powered 4-20 mA), **3-wire** (+ / − / OUT, 4-20 mA sourcing or 0-10 V) or **4-wire** (V+ / V− supply and isolated S+ / S− output). Terminals change with the type. A **❓ Help** button in Properties explains how the sensor works, scaling, wiring diagrams, and troubleshooting. Old projects are converted automatically.
- **Valves & Actuators (new library group, 3 parts):** **Solenoid valve panel** with a terminal block (COM + Y1…Y8, 1-8 valves, normally closed / normally open, click a valve for manual override), **Actuated valve – single acting** (spring return, fail-closed / fail-open, one solenoid pilot A1 / A2) and **Actuated valve – double acting** (5/2 double solenoid, OPEN / CLOSE / COM, holds its last position). Each valve shows **OPEN (green) / CLOSED (red) / travelling (amber)** on the symbol, in the results table and in Properties; stroke time and air-supply failure are simulated. Every part has a ❓ Help button with a wiring diagram. Code: `js/valves.js`.
- Under the hood: parts may now define `dyn(c)` (per-instance terminals / size) and `chg(c,key)` (reaction to a changed property); see `dd()` in `draw.js` and the PLC in `plc.js`.

## v7 – PLC with ladder logic
- **PLC (Automation group)** is now simulated: 8 inputs **I0.0–I0.7** (24 V sinking), 8 relay outputs **Q0.0–Q0.7** with common **1L**, supply **L+ / M**, RUN / STOP mode in Properties. A small LED beside every I/O terminal shows its live state on the sheet (inputs yellow, outputs green; forced inputs have an orange ring).
- **Double-click the PLC** (or *Edit ladder logic* in Properties) to open the ladder editor: **NO / NC contacts, parallel branches, OUT / SET / RST coils, TON timer, CTU counter**, rung comments, add / move / delete rungs. Addresses: I, Q, M0.0–M1.7 (memory bits), T0–T7, C0–C7.
- Editor workflow: click a rung, press a contact button to add it (new elements go *after* the selected one), **Branch** wraps the selected contact in a parallel row (default address = the rung's output, so a seal-in is two clicks), click the left/right bar of a branch to select the whole branch. **Delete** key removes the selection.
- **Live view** while the simulation runs: energised wires / contacts turn green, timers and counters show their values, and the I/O strip shows every bit; click an input chip to *force* it for testing without wiring a switch.
- The program is saved with the project, copied by *Duplicate*, and stops (memory cleared) when the simulation stops or the PLC loses power. One scan per 20 ms tick.
- New file `js/plc.js`.

## v6
- **Multimeter (Fluke-style)** – click the dial (left half = back, right half = forward) or pick the function in Properties: **V AC, V DC, mV, Ω, Continuity (beep), Diode, Hz, mA, A**. Four jacks: A (10 A), mA, COM, VΩ. DC readings are signed (swap the leads and you get a minus), AC reads RMS, Ω / continuity / diode read the *dead* network like a real meter, current modes must be wired in series. Leads left in a current jack across a supply short it and blow the meter fuse (*Replace fuse* in Properties). Works even with no supply on the sheet for Ω / continuity / diode.
- **Signal Injector** – 0–10 V source, 4–20 mA source (24 V compliance) and 4–20 mA *simulate* (loop-powered, needs an external supply). MODE, − / + (0.1 steps) and 0 / 25 / 50 / 75 / 100 % buttons on the device and in Properties. 25 mA limit on the volt range. Acts as a supply, so it can run a circuit on its own.
- **Phase Failure / Sequence Relay** – monitors L1 L2 L3: phase loss, asymmetry, under / over-voltage, wrong sequence; trip delay; changeover output 15-16-18. Contacts (e.g. `cno` named KP1) can follow it.
- **Level Rods 3-rod / 5-rod** – tank with E + L/H (or E + LL/L/H/HH) rods; set the water level with the −5 % / +5 % buttons or in Properties.
- **Level Controller 3-rod / 5-rod** – fill / empty mode with hysteresis; 5-rod adds dry-run lock-out (LL) and a high-level alarm contact (HH → 25-28).
- New file `js/parts2.js`; parts can now define `sim`, `tk`, `st`, `msg`, `fin`, `clk`, `pp` hooks (see the header of that file).

## v5
- **Multimeter (DMM)** – yellow handheld symbol with LCD and dial; functions V, A (in series) and Ω (de-energised circuit). Reading also appears in the results table.
- **Fault Injector** – arm it across (or in series with) any part, pick *Short circuit / Open circuit / Leakage*, then click it while running (or tick *Fault ACTIVE*) to test breakers, fuses and overloads.
- New parts: Reactor / Choke, Braking Resistor, Beacon / Strobe, Key Switch.
- Professional CAD-style look: dark workspace with the sheet floating on it, refined ribbon, panels, tables and fields.

## v4
- **VFD is now simulated** – ramps up/down, V/f control (linear or quadratic) with torque boost, run from terminals (RUN / REV + COM, 24 V), keypad, or an **AI1 0–10 V speed pot** (new *Potentiometer* part). The drive's keypad display shows Hz, rpm, status, output A / V and the set frequency. Settings in Properties: motor current, rated speed, base / min / max frequency, accel & decel time, stop mode (ramp / coast), control mode, boost, overcurrent trip (with *Reset fault*).
- **Motor speed** – the 3-phase motor follows the drive frequency (or the mains) with slip, load torque (constant or fan/pump), direction from phase sequence and run-up / coast-down inertia. rpm is shown on the motor symbol and in the results table; current follows load and frequency.
- **3-pole contactor with coil** added.
- **AutoCAD-style**: Undo / Redo (Ctrl+Z, Ctrl+Y), *Dimension* and *Arrow / leader* tools, *Array* (rows × columns), *Scale*, status bar with cursor X/Y in mm and **GRID (F7) · SNAP (F9) · ORTHO (F8)**, plus matching command-line entries (`DIM`, `LE`, `U`, `AR`, `SC` …).
- Soft starter is still symbol-only (the PLC is simulated since v7).

## v3
- **Resize parts** – select a part and drag the round handle at its corner to make it bigger or smaller (40 %–400 %), or type *Size (%)* in Properties. Wires follow.
- **Command line (like AutoCAD)** – just start typing on the sheet: `L` suggests Line, `C` Circle / Copy, `T` Text, `RO` Rotate, `E` Erase, `PLOT`, `RUN`, or any component name (e.g. `lamp`). Up/Down to choose, Enter or click to run, Tab to complete, Esc to cancel. Enter on an empty line repeats the last command.
- **One top bar** – the separate title bar is gone. Tabs are on the left; Run / Pause / Stop, status, Sheet setup, Print, menu and Properties are small buttons on the right.
- **Dragging** – smaller terminal hit-zones (parts are easier to grab), no dead-zone before a part moves, wires stay smooth while moving.

## Earlier changes
- **Smooth dragging** – a part now follows the pointer exactly (no grid-jumping); on release it glides onto the nearest grid point so its terminals stay aligned with wires. Rendering was also lightened (static sheet cached, results table throttled while dragging).
- **Lamp colour** – Lamp and Pilot Lamp have a *Lamp colour* option in Properties (yellow, white, red, green, blue, orange, amber, violet); the glow follows the chosen colour.
- **AutoCAD-style ribbon** – tabs **Home · Insert · Annotate · View · Output** with panels: Draw (Line, Circle, Rectangle), Modify (Move, Rotate, Copy, Erase), Annotation (Text, Logo), Zoom, Palettes, Plot, Page setup.
- **Circle tool** – drag from the centre outwards; resize with the handles; set radius, colours, fill and line style in Properties.
- **Plot dialog** – *Print* / *Plot* asks for **paper size (A5, A4, A3, A2)** and **orientation (landscape / portrait)**, with a live preview, and whether to plot all sheets or the current one. Paper and orientation can also be set from the Output tab or Sheet setup.

## Earlier changes
- **Drag parts from the library** – press and drag a part (mouse, pen or finger); a ghost follows the pointer and a snapped preview shows exactly where it will land. Tap a part to drop it in the middle of the view instead. Placed parts can be dragged freely; arrow keys nudge the selection.
- **Draw your own title block** – no fixed title block any more. The tool strip on the sheet has **Select · Line · Box · Text · Logo**. Draw lines and boxes, type text (auto-fill tokens `{page} {pages} {title} {project} {dwgno} {rev} {date}`), add a logo and drag its corners to resize. Tick *Show on every page* to repeat it on all sheets and in the PDF. Hold Alt for free (un-snapped) placement; Shift or a near-straight drag keeps lines straight.
- **Wire colours** – after you connect two terminals the new wire is selected and the right panel asks for its colour (24 swatches incl. light colours, a custom picker, thickness, solid / dashed / dotted). With nothing selected the same controls set the colour of *new* wires. Wires can also be drawn by dragging from one terminal to another.
- **Hideable bottom bars** – the results table and the sheet tabs each have a ▾ button; a ▴ button on the sheet (and the ⋯ menu) brings them back.
- **3-phase supply redone** – L1 L2 L3 now sit in the same columns as 3-pole breakers, contactors and motors (wires drop straight down), N and PE to the right. Supply power is computed with complex power so line-to-line and mixed loads add up correctly. The 3-phase motor now honours Star / Delta.
- Multiple pages, PDF export (sheets + parts list), hideable library / properties panels and the touch UI are unchanged.

## Simulation notes
- AC is solved as steady-state RMS phasors; 3-phase sources are 0°/−120°/+120°, so line-to-line loads and phase loss work.
- Contacts follow the coil with the same label (any page). “Net / Page Link” parts with the same name are one node.
- The VFD, motor speed and potentiometer are simulated (see v4). Soft starter is symbol-only.

## Extending
Add a part to `D` in `js/registry.js`. Terminal coordinates should be multiples of 20.
Files: `evalve.js` (electric modulating valve) · `pneumatic.js` (CDA, air-operated valves) · `registry.js` (parts) · `parts2.js` (v6 instruments, relays, level parts) · `plc.js` (PLC part, scan engine, ladder editor) · `solver.js` (MNA engine) · `draw.js` (sheet, wires, drawn shapes) · `export.js` (PDF) · `app.js` (UI). PDF uses bundled jsPDF (MIT) in `js/vendor`.
