# ElectroSim – Electrical Control Simulator

Browser-based drawing + simulation of industrial control circuits (HTML, CSS, JavaScript – no build step).

- `index.html` – landing page (modelled on the structure of sinaulistrik.com)
- `simulator.html` – the simulator
- `js/parts.js` – symbol library (IEC 60617 / EPLAN-style, vertical layout, pin numbers, ratings)
- `js/app.js` – MNA solver, A4 drawing sheet, UI, PDF export
- `css/theme.css` – brand colour tokens (edit here to re-skin everything)

## Run
Open `index.html`, or serve the folder (`python3 -m http.server`). GitHub Pages: deploy from `main` / root.

## Using it
Drag parts onto the sheet · click terminal → click bends → click terminal to wire · R rotates · Del deletes.
Coils (`kc`, timers) and contacts (`cno`, `cnc`, `p3`) are separate parts: pick the coil in **Controlled by**.
RUN, then click switches / hold push buttons. EXPORT PDF gives the A4 drawing + parts list.

## Adding a part
Add an entry with `reg('key',{n,cat,pre,t,p,el,cl,g,sub})` in `js/parts.js`.
Limitations: AC is steady-state RMS; motors are resistive loads; no 3-phase or PLC blocks yet.
