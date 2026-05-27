package com.addventure.app.ui

import android.animation.ObjectAnimator
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.view.animation.AccelerateDecelerateInterpolator
import com.addventure.app.R

/**
 * Extension functions for implementing lightweight, kid-friendly animations.
 */

/**
 * Sets a click listener that animates a scale down and overshoot bounce back on click.
 * Respects the "Smooth Mode" preference dynamically.
 */
fun View.setBouncyClickListener(action: () -> Unit) {
    var lastClickTime = 0L
    this.setOnClickListener { v ->
        val currentTime = System.currentTimeMillis()
        if (currentTime - lastClickTime < 500) {
            return@setOnClickListener
        }
        lastClickTime = currentTime

        val sharedPrefs = v.context.getSharedPreferences("add_venture_prefs", android.content.Context.MODE_PRIVATE)
        val isSmoothMode = sharedPrefs.getBoolean("smooth_mode", false)
        
        if (isSmoothMode) {
            action()
        } else {
            v.animate()
                .scaleX(0.90f)
                .scaleY(0.90f)
                .setDuration(80)
                .setInterpolator(DecelerateInterpolator())
                .withEndAction {
                    v.animate()
                        .scaleX(1.0f)
                        .scaleY(1.0f)
                        .setDuration(160)
                        .setInterpolator(OvershootInterpolator(3.0f))
                        .withEndAction {
                            action()
                        }
                        .start()
                }
                .start()
        }
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
 * Fades in and scales up the view cleanly with a beautiful overshoot bounce pop.
 */
fun View.fadeInPop(delay: Long = 0) {
    this.alpha = 0f
    this.scaleX = 0.6f
    this.scaleY = 0.6f
    this.visibility = View.VISIBLE
    this.animate()
        .alpha(1f)
        .scaleX(1.0f)
        .scaleY(1.0f)
        .setDuration(350)
        .setStartDelay(delay)
        .setInterpolator(OvershootInterpolator(1.8f))
        .start()
}

/**
 * Continually bobs a view up and down in a gentle floating motion to add life.
 */
fun View.startFloatingAnimation() {
    // Slower, smoother bobbing for a calmer feel
    this.animate()
        .translationY(8f)
        .setDuration(2000)
        .setInterpolator(AccelerateDecelerateInterpolator())
        .withEndAction {
            this.animate()
                .translationY(-8f)
                .setDuration(2000)
                .setInterpolator(AccelerateDecelerateInterpolator())
                .withEndAction { this.startFloatingAnimation() }
                .start()
        }
        .start()
    this.animate()
        .translationY(12f)
        .setDuration(1500)
        .setInterpolator(AccelerateDecelerateInterpolator())
        .withEndAction {
            this.animate()
                .translationY(-12f)
                .setDuration(1500)
                .setInterpolator(AccelerateDecelerateInterpolator())
                .withEndAction {
                    this.startFloatingAnimation()
                }
                .start()
        }
        .start()
}

// New pulse animation for subtle emphasis
fun View.pulse() {
    val animator = android.animation.ObjectAnimator.ofFloat(this, "alpha", 1f, 0.7f, 1f)
    animator.duration = 500L
    animator.start()
}

// Show owl librarian notification for incorrect answers
fun android.content.Context.showOwlLibrarianNotification(message: String) {
    val dialogView: View = android.view.LayoutInflater.from(this).inflate(R.layout.dialog_owl_librarian, null)
    val imageView = dialogView.findViewById<android.widget.ImageView>(R.id.ivOwl)
    val textView = dialogView.findViewById<android.widget.TextView>(R.id.tvOwlMessage)
    imageView.setImageResource(R.drawable.owl_librarian)
    textView.text = message
    com.google.android.material.dialog.MaterialAlertDialogBuilder(this)
        .setView(dialogView)
        .setCancelable(true)
        .show()
}
