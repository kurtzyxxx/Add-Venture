# Add-Venture 🍎🦉

> **An Adaptive Game-Based Mobile Learning Application for Early Addition Mastery**  
> *Developed for Grade 1 Learners under the DepEd MATATAG Curriculum Framework*  
> *Cebu Institute of Technology – University | College of Computer Studies*

---

[![Platform](https://img.shields.io/badge/Platform-Android%2010%2B%20(API%2029%2B)-green.svg)](https://developer.android.com)
[![Framework](https://img.shields.io/badge/Framework-React%20Native%20%7C%20Expo-blue.svg)](https://reactnative.dev)
[![Language](https://img.shields.io/badge/Language-TypeScript%205.x-blue.svg)](https://www.typescriptlang.org)
[![Storage](https://img.shields.io/badge/Storage-AsyncStorage%20(100%25%20Offline)-orange.svg)](https://react-native-async-storage.github.io/async-storage)
[![Curriculum](https://img.shields.io/badge/Curriculum-DepEd%20MATATAG%20Grade%201-red.svg)](https://www.deped.gov.ph)
[![Build](https://img.shields.io/badge/Release%20APK-v1.0%20(85.3%20MB)-brightgreen.svg)](#-standalone-release-apk)

---

## 📖 Table of Contents
1. [Overview & Pedagogical Background](#-overview--pedagogical-background)
2. [Key Features & Pedagogical Innovations](#-key-features--pedagogical-innovations)
3. [System Architecture](#-system-architecture)
4. [Tech Stack](#-tech-stack)
5. [Project Directory Structure](#-project-directory-structure)
6. [Getting Started & Local Setup](#-getting-started--local-setup)
7. [Building the Standalone Release APK](#-building-the-standalone-release-apk)
8. [Testing & Quality Assurance](#-testing--quality-assurance)
9. [Companion Documentation](#-companion-documentation)
10. [Development Team](#-development-team)

---

## 🌟 Overview & Pedagogical Background

**Add-Venture** is a standalone, offline Android game-based learning application created to help Grade 1 Filipino learners (ages 6–7) build conceptual understanding, procedural fluency, and confidence in two single-digit addition.

### Pedagogical Foundations
- **DepEd MATATAG Curriculum Alignment:** Directly maps to Grade 1 Mathematics competencies involving single-digit addition facts, visual grouping, anchor-based counting, and part-whole relationships.
- **Bruner’s Concrete-Pictorial-Abstract (C-P-A) Model:**
  1. *Concrete:* Tactile manipulation of interactive fruit objects in dual baskets.
  2. *Pictorial:* Singapore Math Part-Whole diagrams and Fruit Trunk representations.
  3. *Abstract:* Mental addition and symbolic numerals as visual guidance fades.
- **Non-Punitive Mastery Learning:** Replaces punitive failure gates with real-time, 0-penalty demonstrational hints led by **Oliver the Owl**, preserving learner motivation and star rewards.

---

## 🚀 Key Features & Pedagogical Innovations

### 1. Three Core Learning Strategies
* **🍎 Count All (`FR-CA-01`):** Learners count concrete fruit objects across dual baskets (`Basket 1` and `Basket 2`). Tap counting allows counting in **arbitrary order** (left-to-right, right-to-left, or alternating) with animated numerical badges (`1`..`N`).
* **🍊 Count On (`FR-CO-01`):** Features a pulsating **Starting Anchor ring** (`num1` inside the basket) and a **Next-Number Clue banner** (`"Start at 4! Next is 5. Count on 3 more: 5, 6, 7!"`). Narration plays at a calibrated **0.78x speech rate** for optimal auditory processing.
* **🍓 Number Bonds (`FR-NB-02`):** Implements the Singapore Math Part-Whole diagram paired with the **Concrete Fruit Trunk Box** (70% opacity, 22sp fruit symbols) connecting concrete quantities with abstract numerals. A **24dp vertical safety margin** separates the trunk box from the enlarged $\ge 84\times 84\text{dp}$ keypad buttons to prevent accidental taps.

### 2. Gentle In-Session Remediation (`FR-AP-04`)
* **`IncorrectModal`:** Friendly, encouraging modal (*"Let's Try Together! 🌱 Mistakes help our brain grow stronger!"*) with `"Try Again 🔄"` and `"Show Me! 🦉"` options.
* **`DemonstrationBanner`:** Anchored at the canvas top (`GUIDED PRACTICE • 0 PENALTY`), Oliver walks learners through step-by-step animated counting. The demonstration is **100% free with 0 tries deducted**, ensuring young learners are never penalized for seeking help.

### 3. Dynamic Adaptive Difficulty Engine (`FR-AP-01` – `FR-AP-03`)
* Evaluates accuracy and average response time per session behind the scenes.
* Dynamically adjusts number ranges (Level 1: $1-5$; Level 2: $1-9$) and fades visual scaffolding at Level 3 (abstract mode) as competency increases.

### 4. Advanced Analytics & Parental Dashboard (`FR-PM-01`)
* **3 Competency Pillars:** Measures **Conceptual Accuracy**, **Response Fluency (Speed)**, and **Scaffolding Independence (% solved without hints)**.
* **Longitudinal Progress Trend Sparklines:** Visualizes weekly accuracy trajectories (Weeks 1 to 4).
* **Plain-Language Parental Advice Engine:** Generates actionable, child-specific home-learning recommendations without complex psychometric jargon.

### 5. Sunny Orchard Progression Map
* Bright, child-friendly thematic roadmap replacing abstract menus.
* Includes a **1-tap "PLAY NEXT" card** allowing immediate resumption of the current learning milestone.
* Enforces mastery unlocking (requires $\ge 60\%$ accuracy and 10 activities on the preceding strategy to unlock the next orchard).

---

## 🏗️ System Architecture

Add-Venture follows a **Three-Tier Object-Oriented Architecture** designed for high modularity, testability, and 100% offline reliability:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer (UI)                      │
│   HomeScreen (Sunny Orchard) │ Game Screens (CountAll, CountOn, │
│   NumberBonds) │ DemonstrationBanner │ IncorrectModal            │
│   AdvancedAnalyticsScreen │ ProgressScreen │ SettingsScreen     │
└────────────────────────────────┬────────────────────────────────┘
                                 │ User actions & state changes
┌────────────────────────────────▼────────────────────────────────┐
│               Business Logic Layer (Core Engine)                │
│   GameManager (Singleton Controller)                            │
│   ├── AdaptiveDifficultyEngine (Parameter Scaling)              │
│   ├── AudioManager (0.78x Speech Synthesis & SFX)               │
│   └── Problem Generators (Fact Families & Scaffolding)          │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Local persistence calls
┌────────────────────────────────▼────────────────────────────────┐
│                   Data Persistence Layer                        │
│   SaveSystem (Profile, Progress, Analytics & Misconceptions)    │
│   └── AsyncStorage (Encrypted on-device JSON storage)           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💻 Tech Stack

| Component | Technology | Version / Specification |
| :--- | :--- | :--- |
| **Framework** | React Native / Expo | Expo SDK 51 / React Native 0.74.5 |
| **Language** | TypeScript | TypeScript 5.3 (Strict Type Checking) |
| **Navigation** | React Navigation | Native Stack Navigator v6 |
| **Styling & UI** | StyleSheet / Expo Linear Gradient | Flexbox, SVG Vector Shapes |
| **Vector Graphics** | `react-native-svg` | Crisp responsive SVG bonds & roadmaps |
| **Audio & TTS** | `expo-speech` & `expo-av` | Calibrated 0.78x pacing, 1.2 pitch |
| **Data Storage** | `@react-native-async-storage` | 100% Local On-Device Persistence |
| **Target OS** | Android | Android 10+ (API Level 29 to 34) |

---

## 📁 Project Directory Structure

```
Add-Venture/
├── AddVenture.apk               # Standalone signed release APK (85.3 MB)
├── README.md                    # Project documentation (this file)
├── Documentation/               # Comprehensive capstone documentation suite
│   ├── Add-Venture_Software Proposal.docx
│   ├── Add-Venture _ MVP Validation Findings & Refactoring Priorities.docx
│   ├── Add-Venture_Revised SRS.docx
│   ├── Add-Venture_Revised SDD.docx
│   ├── Add-Venture_Software_Test_Document.docx
│   └── SPMP_AddVenture_Final.docx
└── AddVentureRN/                # React Native project root
    ├── assets/                  # App icons, splash screens, audio assets
    ├── android/                 # Android native project and Gradle harness
    ├── src/
    │   ├── components/          # Reusable UI components
    │   │   ├── DemonstrationBanner.tsx  # Active non-punitive scaffolding
    │   │   ├── IncorrectModal.tsx        # Encouraging remediation modal
    │   │   ├── HintConfirmModal.tsx      # Confirmation dialog
    │   │   ├── GreatJobOverlay.tsx       # Celebration feedback
    │   │   └── TimerBar.tsx              # Unobtrusive response timer
    │   ├── core/                # Core Object-Oriented Engine
    │   │   ├── GameManager.ts            # Central game session controller
    │   │   ├── AdaptiveDifficultyEngine.ts # Dynamic difficulty scaling
    │   │   ├── AudioManager.ts           # 0.78x audio & sound effects
    │   │   └── SaveSystem.ts             # AsyncStorage persistence manager
    │   └── screens/             # Application screens
    │       ├── HomeScreen.tsx            # Sunny Orchard Progression Map
    │       ├── ProgressScreen.tsx        # Child stars & achievements
    │       ├── AdvancedAnalyticsScreen.tsx # 3 Pillars parent/teacher dashboard
    │       ├── SessionSummaryScreen.tsx  # Post-session accuracy & stars
    │       ├── SettingsScreen.tsx        # Audio & parental controls
    │       └── game/
    │           ├── CountAllScreen.tsx    # Dual-basket concrete counting
    │           ├── CountOnScreen.tsx     # Starting anchor & clue banner
    │           └── NumberBondsScreen.tsx # Fruit trunk box & Part-Whole
    ├── App.tsx                  # Root navigation stack configuration
    ├── package.json             # Dependencies and build scripts
    └── tsconfig.json            # Strict TypeScript configuration
```

---

## ⚙️ Getting Started & Local Setup

### Prerequisites
* **Node.js:** `v18.x` or `v20.x` LTS
* **npm:** `v9.x` or higher
* **Java Development Kit (JDK):** JDK 17 (for Android native builds)
* **Android SDK:** API Level 34 with Android Build Tools
* **Expo CLI:** `npm install -g expo-cli` (optional)

### 1. Clone the Repository
```bash
git clone https://github.com/earlgeraldesparcia/Add-Venture.git
cd Add-Venture/AddVentureRN
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Verify TypeScript Compilation
```bash
npx tsc --noEmit
```
*(Should pass with 0 errors)*

### 4. Run the Development Server
```bash
npx expo start
```
* Press `a` to open on an Android emulator or connected USB device.
* Or scan the QR code using the **Expo Go** application on your physical device.

---

## 📦 Standalone Release APK

A standalone release APK has been compiled, signed, and tested offline:

* **File Location:** [`AddVenture.apk`](file:///c:/Users/earlg/OneDrive/Music/Add-Venture/AddVenture.apk) *(Root)*  
  *(Also available at `AddVentureRN/android/app/build/outputs/apk/release/app-release.apk`)*
* **Build Size:** ~85.3 MB
* **Minimum Specification:** Android 10 (API Level 29), 2 GB RAM, 500 MB free storage.
* **Network Requirement:** **100% Offline** (no Wi-Fi, backend, or cloud login needed).

### How to Build the Release APK from Source:
```bash
cd AddVentureRN/android
./gradlew assembleRelease
```
The APK will be generated at `android/app/build/outputs/apk/release/app-release.apk`.

---

## 🧪 Testing & Quality Assurance

The application underwent rigorous functional, boundary, and non-functional verification as defined in the **Software Test Document (STD)**:

* **Test Suite:** 28 comprehensive test cases (`TC-101` through `TC-604`).
* **Test Execution Results:** **28 Passed / 0 Failed (100% Pass Rate)**.
* **Key Non-Functional Requirements Verified:**
  - `NFR-PF-01` (Performance): Touch response latency $< 200\text{ms}$; transitions $< 2\text{s}$.
  - `NFR-SC-01` (Security & Privacy): Zero cloud transmission; learner data strictly confined to local device storage.
  - `NFR-RL-01` (Reliability): 100% offline functionality; session state survives unexpected app terminations.
  - `NFR-AC-01` (Accessibility): Touch targets meet $\ge 84\times 84\text{dp}$; text contrast $\ge 4.5:1$; font size $\ge 18\text{sp}$; TTS pacing at 0.78x.

---

## 📚 Companion Documentation

All formal capstone documentation artifacts are stored in the [`Documentation/`](file:///c:/Users/earlg/OneDrive/Music/Add-Venture/Documentation/) directory:

| Document | File Name | Description |
| :--- | :--- | :--- |
| **Software Proposal** | [`Add-Venture_Software Proposal.docx`](file:///c:/Users/earlg/OneDrive/Music/Add-Venture/Documentation/Add-Venture_Software%20Proposal.docx) | Approved project proposal containing the 4 General Objectives & Specific SMART Objectives. |
| **MVP Validation Report** | [`Add-Venture _ MVP Validation Findings & Refactoring Priorities.docx`](file:///c:/Users/earlg/OneDrive/Music/Add-Venture/Documentation/Add-Venture%20_%20MVP%20Validation%20Findings%20%26%20Refactoring%20Priorities.docx) | Empirical validation findings from 28 participants (22 Grade 1 pupils, 6 educators) and refactoring priorities. |
| **Revised SRS v2.0** | [`Add-Venture_Revised SRS.docx`](file:///c:/Users/earlg/OneDrive/Music/Add-Venture/Documentation/Add-Venture_Revised%20SRS.docx) | Complete functional and non-functional specifications aligned with DepEd MATATAG and C-P-A. |
| **Revised SDD v2.0** | [`Add-Venture_Revised SDD.docx`](file:///c:/Users/earlg/OneDrive/Music/Add-Venture/Documentation/Add-Venture_Revised%20SDD.docx) | 3-tier architecture, UML class/sequence diagrams, and high-fidelity UI mockups. |
| **Software Test Document (STD v2.1)** | [`Add-Venture_Software_Test_Document.docx`](file:///c:/Users/earlg/OneDrive/Music/Add-Venture/Documentation/Add-Venture_Software_Test_Document.docx) | Test plan, 28 test cases, full execution logs, and incident report. |
| **Project Management Plan (SPMP v2.1)** | [`SPMP_AddVenture_Final.docx`](file:///c:/Users/earlg/OneDrive/Music/Add-Venture/Documentation/SPMP_AddVenture_Final.docx) | Project lifecycle, WBS, resource allocation, risk management, and delivery schedule. |

---

## 👥 Development Team

**Cebu Institute of Technology – University (CIT-U)**  
*College of Computer Studies | Department of Computer Science*

* **Esparcia, Earl Gerald** – Project Manager / Lead Developer
* **Elorde, Earl Jhon Kenneth** – Developer / UI/UX Designer
* **Mando, Jhecy Leigh** – Developer / Documentation Lead
* **Soco, Kurt Jusam** – Developer / QA & Test Lead
* **Pacana, Clint** – Developer / Backend & Adaptive Logic

---

© 2026 Add-Venture Development Team. All rights reserved.
