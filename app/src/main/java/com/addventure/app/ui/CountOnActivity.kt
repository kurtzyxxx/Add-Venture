package com.addventure.app.ui

import android.content.Intent
import android.os.Bundle
import android.os.CountDownTimer
import android.view.View
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.addventure.app.R
import com.addventure.app.databinding.ActivityCountOnBinding
import com.addventure.app.logic.ActivityManager
import com.addventure.app.viewmodel.ActivityViewModel
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder

class CountOnActivity : AppCompatActivity() {

    private lateinit var binding: ActivityCountOnBinding
    private val viewModel: ActivityViewModel by viewModels()

    private var selectedAnswer: Int? = null
    private var timer: CountDownTimer? = null
    private var elapsedSeconds = 0
    private var activitiesThisSession = 0
    private val maxActivitiesPerSession = 5
    private var correctDialog: androidx.appcompat.app.AlertDialog? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCountOnBinding.inflate(layoutInflater)
        setContentView(binding.root)

        viewModel.startSession()
        setupUI()
        observeData()
        loadNewProblem()
    }

    private fun setupUI() {
        binding.btnBack.setOnClickListener { onBackPressedDispatcher.onBackPressed() }

        binding.btnSubmit.setBouncyClickListener {
            val answer = selectedAnswer
            if (answer != null) {
                viewModel.submitAnswer(answer)
            } else {
                Toast.makeText(this, "Tap a number first!", Toast.LENGTH_SHORT).show()
            }
        }

        binding.btnHint.setBouncyClickListener {
            val hint = viewModel.useHint()
            showHintDialog(hint)
        }
    }

    private fun observeData() {
        viewModel.currentProblem.observe(this) { problem ->
            // Determine bigger and smaller numbers for count on
            val bigger = maxOf(problem.num1, problem.num2)
            val smaller = minOf(problem.num1, problem.num2)

            binding.tvStartNumber.text = bigger.toString()

            // Update instruction dynamically to match the screenshot
            binding.tvInstruction.text = "Start from $bigger and count on $smaller more!"

            // Show count on objects (circles for the smaller number)
            binding.tvCountOnObjects.text = List(smaller) { "🔵" }.joinToString(" ")

            // Show counting steps: bigger → bigger+1 → ... → answer
            val steps = (bigger..bigger + smaller).joinToString(" → ")
            binding.tvCountingSteps.text = steps

            // Setup answer buttons
            setupNumberButtons(problem.correctAnswer)

            selectedAnswer = null
            binding.tvSelectedAnswer.text = "What is the result after dragging?"
            binding.tvFeedback.visibility = View.GONE
            binding.btnSubmit.isEnabled = true

            // Trigger animations
            val isSmoothMode = getSharedPreferences("add_venture_prefs", MODE_PRIVATE).getBoolean("smooth_mode", false)
            if (!isSmoothMode) {
                binding.tvStartNumber.fadeInPop(0)
                binding.tvCountOnObjects.fadeInPop(80)
                binding.tvCountingSteps.fadeInPop(160)
            }

            startTimer()
        }

        viewModel.isCorrectAnswer.observe(this) { isCorrect ->
            if (isCorrect == null) return@observe
            timer?.cancel()

            val isSmoothMode = getSharedPreferences("add_venture_prefs", MODE_PRIVATE).getBoolean("smooth_mode", false)

            if (isCorrect) {
                binding.tvFeedback.visibility = View.VISIBLE
                binding.tvFeedback.setTextColor(getColor(R.color.correct_green))
                binding.btnSubmit.isEnabled = false
                activitiesThisSession++
                showCorrectDialog()
            } else {
                binding.tvFeedback.visibility = View.VISIBLE
                binding.tvFeedback.setTextColor(getColor(R.color.incorrect_red))
                if (!isSmoothMode) {
                    binding.tvFeedback.shake()
                }
                showRetryDialog()
            }
        }

        viewModel.feedbackMessage.observe(this) { message ->
            if (message.isNotEmpty()) {
                binding.tvFeedback.text = message
                binding.tvFeedback.visibility = View.VISIBLE
            }
        }

        viewModel.totalStars.observe(this) { stars ->
            binding.tvStars.text = "+$stars"
        }

        viewModel.currentDifficulty.observe(this) { difficulty ->
            binding.tvDifficulty.text = viewModel.adaptiveEngine.getDifficultyLabel(difficulty)
        }

        viewModel.unlockEvent.observe(this) { strategy ->
            strategy?.let {
                val dialog = correctDialog
                if (dialog != null && dialog.isShowing) {
                    val stars = viewModel.earnedStars.value ?: 0
                    dialog.setMessage("+$stars Stars\n\nYou Unlocked")
                }
                viewModel.clearUnlockEvent()
            }
        }
    }

    private fun setupNumberButtons(correctAnswer: Int) {
        binding.numberButtonsContainer.removeAllViews()

        val options = mutableSetOf(correctAnswer)
        while (options.size < 4) {
            val rand = (maxOf(1, correctAnswer - 3)..correctAnswer + 3).random()
            if (rand > 0) options.add(rand)
        }

        options.sorted().forEach { num ->
            val button = MaterialButton(this, null, com.google.android.material.R.attr.materialButtonStyle).apply {
                text = num.toString()
                textSize = 18f
                minimumWidth = 0
                minWidth = 0
                val size = resources.getDimensionPixelSize(R.dimen.number_button_size)
                layoutParams = LinearLayout.LayoutParams(size, size).apply {
                    marginEnd = resources.getDimensionPixelSize(R.dimen.spacing_xs)
                }
                cornerRadius = size / 2
                setBackgroundColor(getColor(R.color.count_on_color))
                setTextColor(getColor(R.color.white))

                setBouncyClickListener {
                    selectedAnswer = num
                    binding.tvSelectedAnswer.text = num.toString()
                    highlightSelectedButton(this)
                }
            }
            binding.numberButtonsContainer.addView(button)
        }
    }

    private fun highlightSelectedButton(selected: MaterialButton) {
        for (i in 0 until binding.numberButtonsContainer.childCount) {
            val btn = binding.numberButtonsContainer.getChildAt(i) as MaterialButton
            btn.setBackgroundColor(
                if (btn == selected) getColor(R.color.primary) else getColor(R.color.count_on_color)
            )
        }
    }

    private fun startTimer() {
        timer?.cancel()
        elapsedSeconds = 0
        binding.tvTimer.text = "00:00"
        timer = object : CountDownTimer(300000, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                elapsedSeconds++
                binding.tvTimer.text = String.format("%02d:%02d", elapsedSeconds / 60, elapsedSeconds % 60)
            }
            override fun onFinish() {}
        }.start()
    }

    private fun showHintDialog(hint: String) {
        MaterialAlertDialogBuilder(this, com.google.android.material.R.style.MaterialAlertDialog_Material3)
            .setTitle("Need a hint?")
            .setMessage(hint)
            .setPositiveButton("Got it!") { dialog, _ -> dialog.dismiss() }
            .setCancelable(true)
            .show()
    }

    private fun showCorrectDialog() {
        val stars = viewModel.earnedStars.value ?: 0
        val message = "+$stars Stars"

        val builder = MaterialAlertDialogBuilder(this, com.google.android.material.R.style.MaterialAlertDialog_Material3)
            .setTitle("Great Job!")
            .setMessage(message)
            .setPositiveButton("Got it!") { dialog, _ ->
                dialog.dismiss()
                proceedAfterAnswer()
            }
            .setCancelable(false)

        val dialog = builder.create()
        correctDialog = dialog
        dialog.show()

        val isSmoothMode = getSharedPreferences("add_venture_prefs", MODE_PRIVATE).getBoolean("smooth_mode", false)
        val delay = if (isSmoothMode) 1200L else 2000L
        binding.root.postDelayed({
            if (dialog.isShowing) {
                dialog.dismiss()
                proceedAfterAnswer()
            }
        }, delay)
    }

    private fun proceedAfterAnswer() {
        if (activitiesThisSession >= maxActivitiesPerSession) {
            finishSession()
        } else {
            loadNewProblem()
        }
    }

    private fun showRetryDialog() {
        MaterialAlertDialogBuilder(this, com.google.android.material.R.style.MaterialAlertDialog_Material3)
            .setTitle("Oops! Not quite.")
            .setMessage("Let's try again!")
            .setPositiveButton(getString(R.string.btn_try_again)) { dialog, _ ->
                viewModel.retry()
                dialog.dismiss()
            }
            .setNeutralButton(getString(R.string.btn_need_hint)) { dialog, _ ->
                dialog.dismiss()
                showHintDialog(viewModel.useHint())
            }
            .setCancelable(false)
            .show()
    }

    private fun loadNewProblem() {
        viewModel.generateNewProblem(ActivityManager.STRATEGY_COUNT_ON)
    }

    private fun finishSession() {
        viewModel.endSession { session ->
            runOnUiThread {
                val intent = Intent(this, SessionSummaryActivity::class.java).apply {
                    putExtra("SESSION_ACTIVITIES", session?.totalActivities ?: 0)
                    putExtra("SESSION_STARS", session?.totalStars ?: 0)
                    putExtra("SESSION_ACCURACY", session?.averageAccuracy ?: 0f)
                    putExtra("SESSION_CORRECT", session?.totalCorrect ?: 0)
                }
                startActivity(intent)
                finish()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        timer?.cancel()
    }
}
