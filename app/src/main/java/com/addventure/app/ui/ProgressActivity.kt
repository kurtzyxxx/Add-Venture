package com.addventure.app.ui

import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.addventure.app.R
import com.addventure.app.databinding.ActivityProgressBinding
import com.addventure.app.logic.ActivityManager
import com.addventure.app.viewmodel.ActivityViewModel

class ProgressActivity : AppCompatActivity() {

    private lateinit var binding: ActivityProgressBinding
    private val viewModel: ActivityViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProgressBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnBack.setOnClickListener { onBackPressedDispatcher.onBackPressed() }

        observeData()
    }

    private fun observeData() {
        // Learner profile
        viewModel.learnerProfile.observe(this) { profile ->
            profile?.let {
                binding.tvTotalStars.text = it.totalStars.toString()
                val progressPercent = (it.overallProgress * 100).toInt()
                binding.tvOverallProgress.text = "$progressPercent%"
                binding.progressBarOverall.progress = progressPercent
                binding.tvCurrentDifficulty.text = viewModel.adaptiveEngine.getDifficultyLabel(it.currentDifficulty)
            }
        }

        // Per-strategy progress
        viewModel.getProgressRecords().observe(this) { progressList ->
            progressList.forEach { progress ->
                val accuracy = if (progress.totalAttempts > 0)
                    (progress.totalCorrect.toFloat() / progress.totalAttempts * 100).toInt()
                else 0

                when (progress.strategy) {
                    ActivityManager.STRATEGY_COUNT_ALL -> {
                        binding.tvCountAllStars.text = "⭐ ${progress.starsEarned}"
                        binding.tvCountAllStats.text = "${progress.completedActivities} completed • Level ${progress.unlockedLevel} • ${accuracy}% accuracy"
                        binding.progressCountAll.progress = (progress.completedActivities * 10).coerceAtMost(100)
                    }
                    ActivityManager.STRATEGY_COUNT_ON -> {
                        binding.tvCountOnStars.text = "⭐ ${progress.starsEarned}"
                        binding.tvCountOnStats.text = "${progress.completedActivities} completed • Level ${progress.unlockedLevel} • ${accuracy}% accuracy"
                        binding.progressCountOn.progress = (progress.completedActivities * 10).coerceAtMost(100)
                    }
                    ActivityManager.STRATEGY_NUMBER_BONDS -> {
                        binding.tvNumberBondsStars.text = "⭐ ${progress.starsEarned}"
                        binding.tvNumberBondsStats.text = "${progress.completedActivities} completed • Level ${progress.unlockedLevel} • ${accuracy}% accuracy"
                        binding.progressNumberBonds.progress = (progress.completedActivities * 10).coerceAtMost(100)
                    }
                }
            }

            // Build badges based on total progress
            buildBadges(progressList.sumOf { it.totalCorrect })
        }
    }

    private fun buildBadges(totalCorrect: Int) {
        binding.badgesContainer.removeAllViews()

        val badges = listOf(
            Triple("🌱", "Beginner", 1),
            Triple("🌿", "Growing", 5),
            Triple("🌳", "Strong", 10),
            Triple("⭐", "Star Learner", 20),
            Triple("🏆", "Champion", 30),
            Triple("👑", "Master", 50)
        )

        badges.forEach { (emoji, name, threshold) ->
            val earned = totalCorrect >= threshold
            val badgeView = TextView(this).apply {
                val size = resources.getDimensionPixelSize(R.dimen.star_size_large)
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    marginEnd = resources.getDimensionPixelSize(R.dimen.spacing_sm)
                }
                gravity = android.view.Gravity.CENTER
                textSize = 28f
                text = if (earned) emoji else "🔒"
                alpha = if (earned) 1f else 0.4f
            }
            binding.badgesContainer.addView(badgeView)
        }
    }
}
