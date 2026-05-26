package com.addventure.app.ui

import android.animation.ObjectAnimator
import android.view.MotionEvent
import android.view.View
import android.view.animation.DecelerateInterpolator

/**
 * Extension functions for implementing lightweight, kid-friendly animations.
 */

/**
 * Sets a click listener that animates a scale down and bounce back on touch.
 * Respects the "Smooth Mode" preference dynamically.
 */
fun View.setBouncyClickListener(action: () -> Unit) {
    this.setOnTouchListener { v, event ->
        if (!v.isEnabled) {
            return@setOnTouchListener false
        }
        val sharedPrefs = v.context.getSharedPreferences("add_venture_prefs", android.content.Context.MODE_PRIVATE)
        val isSmoothMode = sharedPrefs.getBoolean("smooth_mode", false)
        
        if (isSmoothMode) {
            // Under smooth mode, behave like a standard click listener
            if (event.action == MotionEvent.ACTION_UP) {
                v.playSoundEffect(android.view.SoundEffectConstants.CLICK)
                action()
            }
            return@setOnTouchListener true
        }

        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                v.animate()
                    .scaleX(0.95f)
                    .scaleY(0.95f)
                    .setDuration(100)
                    .setInterpolator(DecelerateInterpolator())
                    .start()
            }
            MotionEvent.ACTION_UP -> {
                v.animate()
                    .scaleX(1.0f)
                    .scaleY(1.0f)
                    .setDuration(100)
                    .setInterpolator(DecelerateInterpolator())
                    .withEndAction {
                        v.playSoundEffect(android.view.SoundEffectConstants.CLICK)
                        action()
                    }
                    .start()
            }
            MotionEvent.ACTION_CANCEL -> {
                v.animate()
                    .scaleX(1.0f)
                    .scaleY(1.0f)
                    .setDuration(100)
                    .setInterpolator(DecelerateInterpolator())
                    .start()
            }
        }
        true
    }
}

/**
 * Shakes the view horizontally. Typically used for incorrect feedback.
 */
fun View.shake() {
    val animator = ObjectAnimator.ofFloat(this, "translationX", 0f, 20f, -20f, 20f, -20f, 10f, -10f, 5f, -5f, 0f)
    animator.duration = 400
    animator.start()
}

/**
 * Fades in and scales up the view cleanly.
 */
fun View.fadeInPop(delay: Long = 0) {
    this.alpha = 0f
    this.scaleX = 0.85f
    this.scaleY = 0.85f
    this.visibility = View.VISIBLE
    this.animate()
        .alpha(1f)
        .scaleX(1.0f)
        .scaleY(1.0f)
        .setDuration(250)
        .setStartDelay(delay)
        .setInterpolator(DecelerateInterpolator())
        .start()
}
