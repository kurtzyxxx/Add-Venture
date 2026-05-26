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

                buildPathNodes(container, progress.unlockedLevel, progress.completedActivities)
                label.text = "Level ${progress.unlockedLevel} unlocked • ${progress.completedActivities} completed • ⭐ ${progress.starsEarned}"
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
                        text = "✅"
                        textSize = 24f
                        setBackgroundColor(getColor(R.color.node_completed))
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
                        text = "🔒"
                        textSize = 20f
                        setBackgroundColor(getColor(R.color.node_locked))
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
