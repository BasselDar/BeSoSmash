# Game Modes

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

---

## The Scoring Engine

BeSoSmash doesn't just rank you by how many keys you press; it evaluates the *quality*, *speed*, and *style* of your smash using a custom weighted formula:

### Smash Score Formula
`Smash Score = (Total Keys × 1337) + (Entropy² × 1.7) + (KPS × 69) + (Profiles Earned × 420)`

This formula guarantees that while raw speed is king, a player who plays with style (high entropy, collecting rare profiles) can outscore someone who just mindlessly mashes a single button.

### How Entropy Works (And how to get 100%)

BeSoSmash uses **Shannon Entropy** to calculate the randomness and spread of your keystrokes. 

- **Low Entropy (0% - 20%):** You smashed only a few keys repeatedly. Mashing WASD or slamming the spacebar yields terrible entropy.
- **High Entropy (80%+):** You utilized a huge portion of the keyboard, giving each key relatively equal attention.
- **How to get exactly 100% Entropy:** The engine standardizes 100% entropy at `6.0` bits of information. Mathematically, `2^6 = 64`. This means to achieve a perfect 100% Entropy score, **you must press at least 64 unique keys exactly the same number of times** before the timer runs out. 
  - If you press fewer than 64 distinct keys, it is *mathematically impossible* to reach 100%.
  - If you just roll your face perfectly across 64+ keys, you achieve 100% peak chaos.
