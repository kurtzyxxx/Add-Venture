package com.addventure.app.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.addventure.app.databinding.ActivityHomeBinding
import com.addventure.app.logic.ActivityManager
import com.addventure.app.viewmodel.ActivityViewModel
import com.addventure.app.R
import com.addventure.app.data.entity.ProgressRecord

class HomeActivity : AppCompatActivity() {

    private lateinit var binding: ActivityHomeBinding
    private val viewModel: ActivityViewModel by viewModels()
    private var isDialogShowing = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupUI()
        observeData()
    }

    private fun setupUI() {
        // Strategy card click listeners
        binding.cardCountAll.setBouncyClickListener {
            startGameActivity(ActivityManager.STRATEGY_COUNT_ALL)
        }

        binding.cardCountOn.setBouncyClickListener {
            startGameActivity(ActivityManager.STRATEGY_COUNT_ON)
        }

        binding.cardNumberBonds.setBouncyClickListener {
            startGameActivity(ActivityManager.STRATEGY_NUMBER_BONDS)
        }

        // Adventure map
        binding.btnAdventureMap.setBouncyClickListener {
            startActivity(Intent(this, AdventureMapActivity::class.java))
        }

        // Bottom navigation
        binding.bottomNav.selectedItemId = R.id.nav_home
        binding.bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_home -> true
                R.id.nav_progress -> {
                    startActivity(Intent(this, ProgressActivity::class.java))
                    true
                }
                R.id.nav_settings -> {
                    showSettingsDialog()
                    true
                }
                else -> false
            }
        }

        // Animate cards on entry
        animateCardsEntry()
    }

    private fun observeData() {
        viewModel.learnerProfile.observe(this) { profile ->
            profile?.let {
                binding.tvTotalStars.text = it.totalStars.toString()
                binding.tvWelcomeUser.text = "Hello, ${it.name}!"

                // If name is the default "Learner", prompt for name customization
                if (it.name == "Learner" && !isDialogShowing) {
                    showNamePromptDialog()
                }
            }
        }

        viewModel.getProgressRecords().observe(this) { progressList ->
            updateStrategyLockStates(progressList)
        }
    }

    private fun showNamePromptDialog() {
        isDialogShowing = true

        val input = android.widget.EditText(this).apply {
            hint = "Your Name"
            textSize = 18f
            setSingleLine()
            gravity = android.view.Gravity.CENTER
            val padding = (16 * resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)
        }

        val container = android.widget.FrameLayout(this).apply {
            val margin = (20 * resources.displayMetrics.density).toInt()
            val params = android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                leftMargin = margin
                rightMargin = margin
                topMargin = margin / 2
                bottomMargin = margin / 2
            }
            addView(input, params)
        }

        com.google.android.material.dialog.MaterialAlertDialogBuilder(this, com.google.android.material.R.style.MaterialAlertDialog_Material3)
            .setTitle("Welcome to Add-Venture! 🦉")
            .setMessage("Let's start your addition adventure. What is your name?")
            .setView(container)
            .setCancelable(false)
            .setPositiveButton("Start Adventure!") { dialog, _ ->
                val name = input.text.toString().trim()
                if (name.isNotEmpty()) {
                    viewModel.updateLearnerName(name)
                    dialog.dismiss()
                    isDialogShowing = false
                } else {
                    android.widget.Toast.makeText(this, "Please enter your name!", android.widget.Toast.LENGTH_SHORT).show()
                    isDialogShowing = false
                    showNamePromptDialog()
                }
            }
            .show()
    }

    private fun updateStrategyLockStates(progressList: List<ProgressRecord>) {
        val countAllProgress = progressList.find { it.strategy == ActivityManager.STRATEGY_COUNT_ALL }
        val countOnProgress = progressList.find { it.strategy == ActivityManager.STRATEGY_COUNT_ON }

        // 1. COUNT_ALL is always unlocked
        binding.cardCountAll.isEnabled = true
        binding.cardCountAll.alpha = 1.0f
        binding.tvCountAllArrow.text = "▶"

        // 2. COUNT_ON unlocks if COUNT_ALL has completed >= 3 activities AND accuracy >= 70%
        val countAllAccuracy = if (countAllProgress != null && countAllProgress.totalAttempts > 0) {
            countAllProgress.totalCorrect.toFloat() / countAllProgress.totalAttempts
        } else {
            0f
        }
        val isCountOnQualified = countAllProgress != null && 
                                 countAllProgress.completedActivities >= 3 && 
                                 countAllAccuracy >= 0.70f

        if (isCountOnQualified) {
            binding.cardCountOn.isEnabled = true
            binding.cardCountOn.alpha = 1.0f
            binding.tvCountOnArrow.text = "▶"
        } else {
            binding.cardCountOn.isEnabled = false
            binding.cardCountOn.alpha = 0.4f
            binding.tvCountOnArrow.text = "🔒"
        }

        // 3. NUMBER_BONDS unlocks if COUNT_ON has completed >= 3 activities AND accuracy >= 70%
        //    AND COUNT_ON itself is unlocked
        val countOnAccuracy = if (countOnProgress != null && countOnProgress.totalAttempts > 0) {
            countOnProgress.totalCorrect.toFloat() / countOnProgress.totalAttempts
        } else {
            0f
        }
        val isNumberBondsQualified = isCountOnQualified &&
                                     countOnProgress != null && 
                                     countOnProgress.completedActivities >= 3 && 
                                     countOnAccuracy >= 0.70f

        if (isNumberBondsQualified) {
            binding.cardNumberBonds.isEnabled = true
            binding.cardNumberBonds.alpha = 1.0f
            binding.tvNumberBondsArrow.text = "▶"
        } else {
            binding.cardNumberBonds.isEnabled = false
            binding.cardNumberBonds.alpha = 0.4f
            binding.tvNumberBondsArrow.text = "🔒"
        }
    }

    private fun startGameActivity(strategy: String) {
        val intent = when (strategy) {
            ActivityManager.STRATEGY_COUNT_ALL -> Intent(this, CountAllActivity::class.java)
            ActivityManager.STRATEGY_COUNT_ON -> Intent(this, CountOnActivity::class.java)
            ActivityManager.STRATEGY_NUMBER_BONDS -> Intent(this, NumberBondsActivity::class.java)
            else -> return
        }
        intent.putExtra("STRATEGY", strategy)
        startActivity(intent)
    }

    private fun applySmoothModeVisuals(isSmoothMode: Boolean) {
        val cards = listOf(binding.cardCountAll, binding.cardCountOn, binding.cardNumberBonds)
        if (isSmoothMode) {
            cards.forEach { card ->
                card.animate().cancel()
                card.alpha = 1f
                card.translationX = 0f
            }
            binding.btnAdventureMap.animate().cancel()
            binding.btnAdventureMap.alpha = 1f
            binding.btnAdventureMap.translationY = 0f
        }
    }

    private fun animateCardsEntry() {
        val isSmoothMode = getSharedPreferences("add_venture_prefs", MODE_PRIVATE).getBoolean("smooth_mode", false)
        val cards = listOf(binding.cardCountAll, binding.cardCountOn, binding.cardNumberBonds)
        
        if (isSmoothMode) {
            applySmoothModeVisuals(true)
        } else {
            cards.forEachIndexed { index, card ->
                card.alpha = 0f
                card.translationX = 200f
                card.animate()
                    .alpha(1f)
                    .translationX(0f)
                    .setDuration(400)
                    .setStartDelay((index * 100).toLong())
                    .start()
            }

            binding.btnAdventureMap.alpha = 0f
            binding.btnAdventureMap.translationY = 50f
            binding.btnAdventureMap.animate()
                .alpha(1f)
                .translationY(0f)
                .setDuration(400)
                .setStartDelay(400)
                .start()
        }
    }

    private fun showSettingsDialog() {
        val sharedPrefs = getSharedPreferences("add_venture_prefs", MODE_PRIVATE)
        val isSmooth = sharedPrefs.getBoolean("smooth_mode", false)
        val currentName = viewModel.learnerProfile.value?.name ?: "Learner"

        val layout = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            val padding = (24 * resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)
        }

        // Name input
        val nameLabel = android.widget.TextView(this).apply {
            text = "Learner's Name"
            textSize = 14f
            setTextColor(getColor(R.color.text_secondary))
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }
        val nameInput = android.widget.EditText(this).apply {
            setText(currentName)
            hint = "Enter name"
            setSingleLine()
            val margin = (8 * resources.displayMetrics.density).toInt()
            setPadding(0, margin, 0, margin)
        }

        // Smooth Mode switch
        val smoothSwitch = com.google.android.material.switchmaterial.SwitchMaterial(this).apply {
            text = "Smooth Mode (No Animations)"
            isChecked = isSmooth
            textSize = 16f
            val margin = (16 * resources.displayMetrics.density).toInt()
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = margin
            }
        }

        layout.addView(nameLabel)
        layout.addView(nameInput)
        layout.addView(smoothSwitch)

        com.google.android.material.dialog.MaterialAlertDialogBuilder(this, com.google.android.material.R.style.MaterialAlertDialog_Material3)
            .setTitle("Settings")
            .setView(layout)
            .setPositiveButton("Save") { dialog, _ ->
                val newName = nameInput.text.toString().trim()
                if (newName.isNotEmpty()) {
                    viewModel.updateLearnerName(newName)
                }
                val newSmooth = smoothSwitch.isChecked
                sharedPrefs.edit().putBoolean("smooth_mode", newSmooth).apply()
                applySmoothModeVisuals(newSmooth)
                dialog.dismiss()
            }
            .setNegativeButton("Cancel") { dialog, _ ->
                dialog.dismiss()
            }
            .setOnDismissListener {
                binding.bottomNav.selectedItemId = R.id.nav_home
            }
            .show()
    }

    override fun onResume() {
        super.onResume()
        binding.bottomNav.selectedItemId = R.id.nav_home
    }
}
