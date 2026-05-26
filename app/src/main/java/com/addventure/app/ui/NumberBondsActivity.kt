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
import com.addventure.app.databinding.ActivityNumberBondsBinding
import com.addventure.app.logic.ActivityManager
import com.addventure.app.viewmodel.ActivityViewModel
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder

class NumberBondsActivity : AppCompatActivity() {

    private lateinit var binding: ActivityNumberBondsBinding
    private val viewModel: ActivityViewModel by viewModels()

    private var selectedAnswer: Int? = null
    private var timer: CountDownTimer? = null
    private var elapsedSeconds = 0
    private var activitiesThisSession = 0
    private val maxActivitiesPerSession = 5
    private var correctDialog: androidx.appcompat.app.AlertDialog? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityNumberBondsBinding.inflate(layoutInflater)
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
            // In Number Bonds: whole = num1 + num2, known part = num1, missing part = num2
            val whole = problem.correctAnswer
            val knownPart = problem.num1

            binding.tvWhole.text = whole.toString()
            binding.tvPart1.text = knownPart.toString()
            binding.tvPart2.text = "?"

            // Equation display
            binding.tvEquation.text = "$knownPart + ? = $whole"

            // Setup number buttons for the missing part (num2)
            setupNumberButtons(problem.num2)

            selectedAnswer = null
            binding.tvFeedback.visibility = View.GONE
            binding.btnSubmit.isEnabled = true

            // Trigger animations
            val isSmoothMode = getSharedPreferences("add_venture_prefs", MODE_PRIVATE).getBoolean("smooth_mode", false)
            if (!isSmoothMode) {
                binding.tvWhole.fadeInPop(0)
                binding.tvPart1.fadeInPop(80)
                binding.tvPart2.fadeInPop(160)
                binding.tvEquation.fadeInPop(240)
            }

            startTimer()
        }

        viewModel.isCorrectAnswer.observe(this) { isCorrect ->
            if (isCorrect == null) return@observe
            timer?.cancel()

            val isSmoothMode = getSharedPreferences("add_venture_prefs", MODE_PRIVATE).getBoolean("smooth_mode", false)

            if (isCorrect) {
                val problem = viewModel.currentProblem.value ?: return@observe
                binding.tvPart2.text = problem.num2.toString()
                binding.tvPart2.setTextColor(getColor(R.color.correct_green))
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
        while (options.size < 5) {
            val rand = (maxOf(1, correctAnswer - 2)..correctAnswer + 3).random()
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
                setBackgroundColor(getColor(R.color.number_bonds_color))
                setTextColor(getColor(R.color.white))

                setBouncyClickListener {
                    selectedAnswer = num
                    binding.tvPart2.text = num.toString()
                    binding.tvPart2.setTextColor(getColor(R.color.number_bonds_color))

                    val problem = viewModel.currentProblem.value
                    if (problem != null) {
                        binding.tvEquation.text = "${problem.num1} + $num = ${problem.correctAnswer}"
                    }

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
                if (btn == selected) getColor(R.color.primary) else getColor(R.color.number_bonds_color)
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
        // Reset color for next problem
        binding.tvPart2.setTextColor(getColor(R.color.incorrect_red))
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
                binding.tvPart2.text = "?"
                binding.tvPart2.setTextColor(getColor(R.color.incorrect_red))
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
        viewModel.generateNewProblem(ActivityManager.STRATEGY_NUMBER_BONDS)
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
