package com.addventure.app.ui

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import com.addventure.app.R
import com.addventure.app.databinding.ActivityOwlIntroBinding

class OwlIntroActivity : AppCompatActivity() {

    private lateinit var binding: ActivityOwlIntroBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityOwlIntroBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupListeners()
    }

    private fun setupListeners() {
        // Option 3 is correct (2 + 1 = 3)
        binding.btnOption3.setOnClickListener {
            handleCorrectAnswer()
        }

        val incorrectClickListener = View.OnClickListener {
            handleIncorrectAnswer()
        }

        binding.btnOption2.setOnClickListener(incorrectClickListener)
        binding.btnOption4.setOnClickListener(incorrectClickListener)
        binding.btnOption5.setOnClickListener(incorrectClickListener)
    }

    private fun handleCorrectAnswer() {
        binding.tvOwlDialog.text = "Hooray! That is correct! Oliver is so happy!\n\nNow, let's help him travel home!"
        binding.tvOwlDialog.setTextColor(getColor(R.color.correct_green))

        // Disable all buttons during success delay
        binding.btnOption2.isEnabled = false
        binding.btnOption3.isEnabled = false
        binding.btnOption4.isEnabled = false
        binding.btnOption5.isEnabled = false

        // Bouncy effect on Oliver
        binding.imgIntroOwl.animate()
            .scaleX(1.15f)
            .scaleY(1.15f)
            .setDuration(300)
            .withEndAction {
                binding.imgIntroOwl.animate()
                    .scaleX(1.0f)
                    .scaleY(1.0f)
                    .setDuration(200)
                    .start()
            }
            .start()

        // Set first login to false so this screen only runs once
        val sharedPrefs = getSharedPreferences("add_venture_prefs", MODE_PRIVATE)
        sharedPrefs.edit().putBoolean("first_login", false).apply()

        // Transition to HomeActivity
        Handler(Looper.getMainLooper()).postDelayed({
            startActivity(Intent(this, HomeActivity::class.java))
            finish()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                overrideActivityTransition(OVERRIDE_TRANSITION_OPEN, android.R.anim.fade_in, android.R.anim.fade_out)
            } else {
                @Suppress("DEPRECATION")
                overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
            }
        }, 2000)
    }

    private fun handleIncorrectAnswer() {
        binding.tvOwlDialog.text = "Hoot... not quite! Let's count again.\n\nWhat is 2 + 1?"
        binding.tvOwlDialog.setTextColor(getColor(R.color.incorrect_red))
        binding.imgIntroOwl.shake()
    }
}
