# Ship destruction: shot list for `fight.vmreplay.json`

Times are what the spectator readout (top left, `T m:ss`) shows. I got them by stepping this same replay in Core
(`voidmech-alpha\tools\marketing\replay-scan`, run on 2026-10-27; it ends on the recorded checksum, so the spectator replays the same events).
"wrecked" = the ship is blown apart; "disabled" = dead in space, mostly intact.

## Run it

```powershell
cd C:\Projects\VoidMech\voidmech-alpha
.\tools\marketing\spectate.ps1                 # opens paused at T 0:00; F12 stills land in voidmech-alpha\game\out\ (gitignored); copy keepers here
```

## Getting to a moment (there is no scrub)

Space plays/pauses, `=` raises speed (up to 4x), `-` lowers it, `0` is 1x, Backspace restarts from 0:00.
To reach a time: play at 4x until about 10 s before it, pause, drop to 0.25x or 0.5x, then ride a ship.
`.` steps one tick while paused (Shift+`.` ten), good for the exact frame of the break-up.

Riding: `T` / Shift+T cycles attackers (the killers), `Tab` cycles every body (press `F` first to limit it to ships),
`R` rides the body nearest the screen centre, `P` the player. The readout names the subject (`#45 attacker Bolt 6`),
matching the names below. `V` toggles free camera, `G` free camera behind the subject, wheel zooms in chase,
`[` `]` change field of view. `H` hides the readout. **F12** saves a PNG; **Shift+F12** saves it with the readout.

## Best moments, in order of how good I expect them to be

| # | T | What | Ships | Why |
|---|---|---|---|---|
| 1 | **2:50 to 3:05** | Biggest fight of the run: 99 blocks destroyed and 7 break-ups in the 2:50 to 3:00 window, 42 and 54 in the two before | attacker Bolt 7 wrecked at 2:58 by patrol Wasp S; patrol Hulk 1 disabled at 3:06 by attacker Bolt 6 (cannon) | Most debris, most ships in one frame |
| 2 | **1:34 to 1:41** | 10 break-ups in 10 s | attacker Dart 8 wrecked 1:37 **by the player's railgun**; attacker Dart 3 wrecked 1:40; patrol Wasp and Miner 3 disabled 1:34 | The only kill the player makes: a hero shot |
| 3 | **0:33 to 0:37** | Three miners lost in about 3 s | Miner 8 wrecked 0:33, Miner 4 disabled 0:34, Bolt 4 wrecked 0:36, all by attacker Darts and Bolts | Fast, readable: attackers visibly picking off miners |
| 4 | **0:40 to 0:50** | 25 blocks and 3 break-ups | Bolt 5 wrecked 0:41 (Dart 6, laser), patrol Bolt 1 wrecked 0:49 (Dart 8), Miner 5 disabled 0:48 | Patrol ship dies, not just a miner |
| 5 | **3:15** | Patrol Bolt 1 wrecked | attacker Bolt 6 | Same Bolt 6 also downs Hulk 1 (3:06), Dart 1 (4:29) and Wasp (4:42): follow it for a kill streak |
| 6 | **4:20** | Miner Bolt 4 wrecked | attacker Bolt C 3, cannon 92% | Cannon kill: shells, not beams |
| 7 | **5:32** | Attacker Wasp R wrecked | patrol Hulk 1, railgun | Defenders winning: good for variety |
| 8 | **1:04** | Miner Bolt 2 disabled | attacker Dart 3, railgun | Railgun kill |

Full list of every loss (28 of them) with ticks: `replay-scan_fight.txt`.

## Videos

The spectator has no video export, and ffmpeg/OBS are not installed here, so record the screen:
- Windows: `Win+Alt+R` (Xbox Game Bar) records the focused window; `Win+Alt+G` saves the last 30 s if background recording is on. Or install OBS and capture the window at 1920x1080, 60 fps.
- Take 10 to 20 s clips: start at 0.5x about 3 s before the hit, run through the break-up, then 0.25x for the debris. Sound is only heard at 1x, so record at 1x if the clip needs audio.
- Use chase camera on the victim, one clip from an attacker's point of view (`T`), and one free-camera pass (`V`, then WASD/Shift).
- Hide the readout with `H` for clean video. Keep the ship's own HUD in at least one clip: the plan wants authentic tactical HUD in combat footage.

## Notes

- Stills are 1920x1080. The 3840x2160 masters in the asset plan would need a bigger window, which the spectator does not offer.
- Naming: F12 writes `voidmech_gameplay_fight_<NN>_<W>x<H>.png`. For this site, rename keepers into the concise pattern `vm_fight_<NN>.png`.
- A different replay gives different ships and fights. Record one by flying a world with `--record=game/out/<name>.vmreplay.json`, then scan it:
  `. .\tools\env.ps1; dotnet run -c Release --project tools\marketing\replay-scan -- <replay>` from the repo root (env.ps1 puts the pinned SDK on the path). The replay must match the build's blocks and tuning.
- `raw/_superseded-generic/` holds my first, rejected scripted-pilot stills. Delete them.
- `tools\marketing\capture.ps1` now only covers editor and title plates. Its canned build `wing` fails to apply on the current data (`Paint` step 1), so the editor set stops there; I did not look into why.
