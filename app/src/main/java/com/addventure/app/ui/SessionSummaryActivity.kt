package com.addventure.app.ui

import android.content.Intent
import android.os.Bundle
import android.view.animation.OvershootInterpolator
import androidx.appcompat.app.AppCompatActivity
import com.addventure.app.databinding.ActivitySessionSummaryBinding

class SessionSummaryActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySessionSummaryBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySessionSummaryBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val totalActivities = intent.getIntExtra("SESSION_ACTIVITIES", 0)
        val totalStars = intent.getIntExtra("SESSION_STARS", 0)
        val accuracy = intent.getFloatExtra("SESSION_ACCURACY", 0f)
        val totalCorrect = intent.getIntExtra("SESSION_CORRECT", 0)

        binding.tvActivities.text = totalActivities.toString()
        binding.tvCorrect.text = totalCorrect.toString()
        binding.tvStarsEarned.text = "+$totalStars Stars"
        binding.tvAccuracy.text = "${(accuracy * 100).toInt()}%"

        binding.btnPlayAgain.setOnClickListener {
            finish()
        }

        binding.btnGoHome.setOnClickListener {
            val intent = Intent(this, HomeActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(intent)
            finish()
        }

        animateEntry()
    }

    private fun animateEntry() {
        val isSmoothMode = getSharedPreferences("add_venture_prefs", MODE_PRIVATE).getBoolean("smooth_mode", false)
        if (isSmoothMode) {
            binding.tvCelebration.scaleX = 1f
            binding.tvCelebration.scaleY = 1f
        } else {
            // Celebration bounce
            binding.tvCelebration.scaleX = 0f
            binding.tvCelebration.scaleY = 0f
            binding.tvCelebration.animate()
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(800)
                .setInterpolator(OvershootInterpolator(2f))
                .start()
        }
    }
}
