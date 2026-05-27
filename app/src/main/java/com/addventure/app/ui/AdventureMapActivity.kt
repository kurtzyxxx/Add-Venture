package com.addventure.app.ui

import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.addventure.app.R
import com.addventure.app.databinding.ActivityAdventureMapBinding
import com.addventure.app.logic.ActivityManager
import com.addventure.app.viewmodel.ActivityViewModel
import com.addventure.app.data.entity.ProgressRecord

class AdventureMapActivity : AppCompatActivity() {

    private lateinit var binding: ActivityAdventureMapBinding
    private val viewModel: ActivityViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAdventureMapBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnBack.setOnClickListener { onBackPressedDispatcher.onBackPressed() }

        observeProgress()
    }

    private fun observeProgress() {
        viewModel.getProgressRecords().observe(this) { progressList ->
            val countAllProgress = progressList.find { it.strategy == ActivityManager.STRATEGY_COUNT_ALL }
            val countOnProgress = progressList.find { it.strategy == ActivityManager.STRATEGY_COUNT_ON }

            val countAllAccuracy = if (countAllProgress != null && countAllProgress.totalAttempts > 0) {
                countAllProgress.totalCorrect.toFloat() / countAllProgress.totalAttempts
            } else 0f

            val isCountOnQualified = countAllProgress != null && 
                                     countAllProgress.completedActivities >= 3 && 
                                     countAllAccuracy >= 0.80f

            val countOnAccuracy = if (countOnProgress != null && countOnProgress.totalAttempts > 0) {
                countOnProgress.totalCorrect.toFloat() / countOnProgress.totalAttempts
            } else 0f

            val isNumberBondsQualified = isCountOnQualified && 
                                         countOnProgress != null && 
                                         countOnProgress.completedActivities >= 3 && 
                                         countOnAccuracy >= 0.80f

            progressList.forEach { progress ->
                val (container, label) = when (progress.strategy) {
                    ActivityManager.STRATEGY_COUNT_ALL ->
                        Pair(binding.countAllNodes, binding.tvCountAllProgress)
                    ActivityManager.STRATEGY_COUNT_ON ->
                        Pair(binding.countOnNodes, binding.tvCountOnProgress)
                    ActivityManager.STRATEGY_NUMBER_BONDS ->
                        Pair(binding.numberBondsNodes, binding.tvNumberBondsProgress)
                    else -> return@forEach
                }

                val isQualified = when (progress.strategy) {
                    ActivityManager.STRATEGY_COUNT_ALL -> true
                    ActivityManager.STRATEGY_COUNT_ON -> isCountOnQualified
                    ActivityManager.STRATEGY_NUMBER_BONDS -> isNumberBondsQualified
                    else -> false
                }

                if (isQualified) {
                    buildPathNodes(container, progress.unlockedLevel, progress.completedActivities)
                    label.text = "Level ${progress.unlockedLevel} unlocked • ${progress.completedActivities} completed • Stars: ${progress.starsEarned}"
                } else {
                    buildPathNodes(container, 0, 0)
                    val parentStrategy = when (progress.strategy) {
                        ActivityManager.STRATEGY_COUNT_ON -> "Count All"
                        ActivityManager.STRATEGY_NUMBER_BONDS -> "Count On"
                        else -> ""
                    }
                    label.text = "Locked • Complete $parentStrategy with at least 80% accuracy to unlock"
                }
            }
        }
    }

    private fun buildPathNodes(container: LinearLayout, unlockedLevel: Int, completed: Int) {
        container.removeAllViews()

        val totalNodes = 5

        for (i in 1..totalNodes) {
            val nodeText = TextView(this).apply {
                val size = resources.getDimensionPixelSize(R.dimen.map_node_size)
                layoutParams = LinearLayout.LayoutParams(size, size).apply {
                    marginEnd = resources.getDimensionPixelSize(R.dimen.spacing_xs)
                }
                gravity = android.view.Gravity.CENTER
                textSize = 14f
                setTypeface(null, android.graphics.Typeface.BOLD)

                when {
                    i <= completed / 3 -> {
                        // Completed
                        text = "✓"
                        setTextColor(getColor(R.color.white))
                        setBackgroundResource(R.drawable.bg_number_bond_circle)
                        background.setTint(getColor(R.color.node_completed))
                        textSize = 16f
                    }
                    i <= unlockedLevel -> {
                        // Unlocked
                        text = i.toString()
                        setTextColor(getColor(R.color.white))
                        setBackgroundResource(R.drawable.bg_number_bond_circle)
                        background.setTint(getColor(R.color.node_unlocked))
                    }
                    else -> {
                        // Locked
                        text = ""
                        setBackgroundResource(R.drawable.bg_number_bond_circle)
                        background.setTint(getColor(R.color.node_locked))
                    }
                }
            }
            container.addView(nodeText)

            // Add path connector between nodes
            if (i < totalNodes) {
                val connector = TextView(this).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        resources.getDimensionPixelSize(R.dimen.spacing_md),
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    )
                    text = "—"
                    gravity = android.view.Gravity.CENTER
                    setTextColor(getColor(R.color.path_color))
                    textSize = 16f
                }
                container.addView(connector)
            }
        }
    }
}
