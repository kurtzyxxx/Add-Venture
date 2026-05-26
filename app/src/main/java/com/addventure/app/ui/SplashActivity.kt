package com.addventure.app.ui

import android.animation.ObjectAnimator
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.OvershootInterpolator
import androidx.appcompat.app.AppCompatActivity
import com.addventure.app.databinding.ActivitySplashBinding

class SplashActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySplashBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)

        animateSplash()

        Handler(Looper.getMainLooper()).postDelayed({
            startActivity(Intent(this, HomeActivity::class.java))
            finish()
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
        }, 2500)
    }

    private fun animateSplash() {
        // Logo bounce animation
        binding.tvLogo.alpha = 0f
        binding.tvLogo.scaleX = 0f
        binding.tvLogo.scaleY = 0f
        binding.tvLogo.animate()
            .alpha(1f)
            .scaleX(1f)
            .scaleY(1f)
            .setDuration(800)
            .setInterpolator(OvershootInterpolator())
            .start()

        // App name slide up
        binding.tvAppName.alpha = 0f
        binding.tvAppName.translationY = 50f
        binding.tvAppName.animate()
            .alpha(1f)
            .translationY(0f)
            .setDuration(600)
            .setStartDelay(400)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .start()

        // Tagline fade in
        binding.tvTagline.alpha = 0f
        binding.tvTagline.animate()
            .alpha(1f)
            .setDuration(600)
            .setStartDelay(700)
            .start()

        // Progress bar fade in
        binding.progressBar.alpha = 0f
        binding.progressBar.animate()
            .alpha(1f)
            .setDuration(400)
            .setStartDelay(1000)
            .start()
    }
}
