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
import com.addventure.app.data.entity.ProgressRecord

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
            val countAllProgress = progressList.find { it.strategy == ActivityManager.STRATEGY_COUNT_ALL }
            val countOnProgress = progressList.find { it.strategy == ActivityManager.STRATEGY_COUNT_ON }

            val countAllAccuracy = if (countAllProgress != null && countAllProgress.totalAttempts > 0) {
                countAllProgress.totalCorrect.toFloat() / countAllProgress.totalAttempts
            } else 0f

            val isCountOnQualified = countAllProgress != null && 
                                     countAllProgress.completedActivities >= 3 && 
                                     countAllAccuracy >= 0.70f

            val countOnAccuracy = if (countOnProgress != null && countOnProgress.totalAttempts > 0) {
                countOnProgress.totalCorrect.toFloat() / countOnProgress.totalAttempts
            } else 0f

            val isNumberBondsQualified = isCountOnQualified && 
                                         countOnProgress != null && 
                                         countOnProgress.completedActivities >= 3 && 
                                         countOnAccuracy >= 0.70f

            progressList.forEach { progress ->
                val accuracy = if (progress.totalAttempts > 0)
                    (progress.totalCorrect.toFloat() / progress.totalAttempts * 100).toInt()
                else 0

                when (progress.strategy) {
                    ActivityManager.STRATEGY_COUNT_ALL -> {
                        binding.tvCountAllStars.text = "Stars: ${progress.starsEarned}"
                        binding.tvCountAllStats.text = "${progress.completedActivities} completed • Level ${progress.unlockedLevel} • ${accuracy}% accuracy"
                        binding.progressCountAll.progress = (progress.completedActivities * 10).coerceAtMost(100)
                    }
                    ActivityManager.STRATEGY_COUNT_ON -> {
                        if (isCountOnQualified) {
                            binding.cardCountOnProgress.alpha = 1.0f
                            binding.tvCountOnStars.text = "Stars: ${progress.starsEarned}"
                            binding.tvCountOnStats.text = "${progress.completedActivities} completed • Level ${progress.unlockedLevel} • ${accuracy}% accuracy"
                            binding.progressCountOn.progress = (progress.completedActivities * 10).coerceAtMost(100)
                        } else {
                            binding.cardCountOnProgress.alpha = 0.4f
                            binding.tvCountOnStars.text = "Stars: 0"
                            binding.tvCountOnStats.text = "Locked • Complete Count All with at least 70% accuracy to unlock"
                            binding.progressCountOn.progress = 0
                        }
                    }
                    ActivityManager.STRATEGY_NUMBER_BONDS -> {
                        if (isNumberBondsQualified) {
                            binding.cardNumberBondsProgress.alpha = 1.0f
                            binding.tvNumberBondsStars.text = "Stars: ${progress.starsEarned}"
                            binding.tvNumberBondsStats.text = "${progress.completedActivities} completed • Level ${progress.unlockedLevel} • ${accuracy}% accuracy"
                            binding.progressNumberBonds.progress = (progress.completedActivities * 10).coerceAtMost(100)
                        } else {
                            binding.cardNumberBondsProgress.alpha = 0.4f
                            binding.tvNumberBondsStars.text = "Stars: 0"
                            binding.tvNumberBondsStats.text = "Locked • Complete Count On with at least 70% accuracy to unlock"
                            binding.progressNumberBonds.progress = 0
                        }
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
            Triple("🌱", "Beginner Counter", 1),
            Triple("⚡", "Fast Thinker", 5),
            Triple("🔥", "Streak", 10)
        )

        badges.forEach { (emoji, name, threshold) ->
            val earned = totalCorrect >= threshold
            
            val badgeLayout = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = android.view.Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(
                    0,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    1f
                )
            }

            val emojiView = TextView(this).apply {
                textSize = 32f
                text = emoji
                gravity = android.view.Gravity.CENTER
                alpha = if (earned) 1f else 0.2f
            }

            val nameView = TextView(this).apply {
                textSize = 11f
                text = name
                gravity = android.view.Gravity.CENTER
                setTextColor(getColor(if (earned) R.color.text_primary else R.color.text_secondary))
                typeface = android.graphics.Typeface.DEFAULT_BOLD
            }

            badgeLayout.addView(emojiView)
            badgeLayout.addView(nameView)
            binding.badgesContainer.addView(badgeLayout)
        }
    }
}
