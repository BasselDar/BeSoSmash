# Game Modes 🎮

BeSoSmash currently supports multiple ways to break your keyboard. Each mode maintains an isolated leaderboard and tracks distinct playstyles.

## 1. Classic Mode
The purest form of the BeSoSmash experience.
- **Duration:** 5.0 Seconds
- **Objective:** Press as many keys as humanly possible, ideally using the entire breadth of the keyboard to maximize mathematical Entropy.
- **Hardware Limitations:** The server enforces a maximum hardware key ceiling (e.g., 350 keys in 5 seconds). Going over trips anti-cheat validation.

## 2. Blitz Mode
A hyper-condensed anxiety simulator.
- **Duration:** 2.0 Seconds
- **Objective:** An explosive sprint. Keys-Per-Second (KPS) drastically inflates in this mode because stamina is not a factor. 
- **Hardware Limitations:** 150 keys maximum allowed.

## Modes in Development

*Note: The following modes might have been experimented with and might leave artifacts in the codebase, but are considered experimental.*

- **Survival:** Continuous typing until a certain KPS threshold is failed.
- **Versus (Frictionless 1v1):** A real-time connection mode connecting two players in a private WebSocket room via a shareable URL to battle head-to-head.
