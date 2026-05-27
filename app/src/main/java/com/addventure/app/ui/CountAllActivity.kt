package com.addventure.app.ui

import android.content.ClipData
import android.content.ClipDescription
import android.content.Intent
import android.os.Bundle
import android.os.CountDownTimer
import android.view.DragEvent
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.widget.LinearLayout
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.addventure.app.R
import com.addventure.app.databinding.ActivityCountAllBinding
import com.addventure.app.logic.ActivityManager
import com.addventure.app.logic.AdaptiveDifficultyEngine
import com.addventure.app.viewmodel.ActivityViewModel
import android.view.ViewGroup
import android.widget.TextView
import com.google.android.material.button.MaterialButton
import com.google.android.material.dialog.MaterialAlertDialogBuilder

class CountAllActivity : AppCompatActivity() {

    private lateinit var binding: ActivityCountAllBinding
    private val viewModel: ActivityViewModel by viewModels()

    private var selectedAnswer: Int? = null
    private var timer: CountDownTimer? = null
    private var elapsedSeconds = 0
    private var activitiesThisSession = 0
    private val maxActivitiesPerSession = 5
    private var correctDialog: androidx.appcompat.app.AlertDialog? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCountAllBinding.inflate(layoutInflater)
        setContentView(binding.root)

        viewModel.startSession()
        setupUI()
        observeData()
        loadNewProblem()
    }

    private fun setupUI() {
        binding.btnBack.setOnClickListener { onBackPressedDispatcher.onBackPressed() }

        // Hide answer input elements
        binding.layoutAnswerInput.visibility = View.GONE
        binding.tvSelectedAnswer.visibility = View.GONE

        // Make Submit button visible again
        binding.btnSubmit.visibility = View.VISIBLE
        binding.btnSubmit.isEnabled = true

        // Restore side-by-side layout params for Hint and Submit buttons
        val hintParams = binding.btnHint.layoutParams as LinearLayout.LayoutParams
        hintParams.width = 0
        hintParams.weight = 1f
        hintParams.marginEnd = resources.getDimensionPixelSize(R.dimen.spacing_sm)
        binding.btnHint.layoutParams = hintParams

        val submitParams = binding.btnSubmit.layoutParams as LinearLayout.LayoutParams
        submitParams.width = 0
        submitParams.weight = 1f
        binding.btnSubmit.layoutParams = submitParams

        binding.btnSubmit.setBouncyClickListener {
            val problem = viewModel.currentProblem.value
            if (problem != null) {
                // Count group1 and group2 fruits inside containerDropZone
                var countGroup1 = 0
                var countGroup2 = 0
                for (i in 0 until binding.containerDropZone.childCount) {
                    val row = binding.containerDropZone.getChildAt(i) as? LinearLayout
                    if (row != null) {
                        for (j in 0 until row.childCount) {
                            val fruitView = row.getChildAt(j)
                            if (fruitView.tag == "group1") {
                                countGroup1++
                            } else if (fruitView.tag == "group2") {
                                countGroup2++
                            }
                        }
                    }
                }

                // Check if they dragged the correct counts for each group
                if (countGroup1 == problem.num1 && countGroup2 == problem.num2) {
                    viewModel.submitAnswer(problem.correctAnswer)
                } else {
                    viewModel.submitAnswer(-1) // triggers standard retry flow
                }
            }
        }

        binding.btnHint.setBouncyClickListener {
            val hint = viewModel.useHint()
            showHintDialog(hint)
        }

        // Setup drag-and-drop listener for the Drop Zone
        val dragListener = View.OnDragListener { v, event ->
            val isMainDropZone = v.id == R.id.layoutDropZone
            when (event.action) {
                DragEvent.ACTION_DRAG_STARTED -> {
                    if (event.clipDescription.hasMimeType(ClipDescription.MIMETYPE_TEXT_PLAIN)) {
                        if (isMainDropZone) {
                            v.setBackgroundResource(R.drawable.bg_drop_zone_active)
                        }
                        true
                    } else {
                        false
                    }
                }
                DragEvent.ACTION_DRAG_ENTERED -> {
                    true
                }
                DragEvent.ACTION_DRAG_EXITED -> {
                    if (isMainDropZone) {
                        v.setBackgroundResource(R.drawable.bg_drop_zone)
                    }
                    true
                }
                DragEvent.ACTION_DROP -> {
                    val draggedView = event.localState as? View
                    if (draggedView != null) {
                        // 1. Remove from its old row parent
                        removeViewFromRowParent(draggedView)

                        // 2. Add to drop zone container with wrapping rows
                        addViewToContainerWithRows(binding.containerDropZone, draggedView)

                        // 3. Play kid-friendly pop animation
                        draggedView.fadeInPop(0)

                        // 4. Set click listener to return it to the source container when tapped
                        draggedView.setOnClickListener {
                            returnFruitToSource(it)
                        }

                        // 5. Update the equation answer count
                        val currentCount = getDroppedFruitsCount()
                        binding.tvAnswer.text = currentCount.toString()
                    }
                    true
                }
                DragEvent.ACTION_DRAG_ENDED -> {
                    if (isMainDropZone) {
                        v.setBackgroundResource(R.drawable.bg_drop_zone)
                    }
                    true
                }
                else -> false
            }
        }
        binding.layoutDropZone.setOnDragListener(dragListener)

        // Start floating animation on Oliver the Owl Guide
        binding.imgOwlCheer.startFloatingAnimation()
    }

    private fun observeData() {
        viewModel.currentProblem.observe(this) { problem ->
            binding.tvNum1.text = problem.num1.toString()
            binding.tvNum2.text = problem.num2.toString()
            binding.tvAnswer.text = "?"

            // Generate fruit objects along with extra decoy fruits
            val (group1, group2) = viewModel.activityManager.getCountAllObjects(problem.num1, problem.num2)
            val fruit1 = group1.firstOrNull() ?: "berry"
            val fruit2 = group2.firstOrNull() ?: "nut"
            val paddedGroup1 = List(problem.num1 + 3) { fruit1 }
            val paddedGroup2 = List(problem.num2 + 3) { fruit2 }

            val getPluralName = { name: String ->
                when (name) {
                    "berry" -> "Berries"
                    "nut" -> "Nuts"
                    "seed" -> "Seeds"
                    else -> name.replaceFirstChar { it.uppercase() }
                }
            }
            binding.tvGroup1Label.text = getPluralName(fruit1)
            binding.tvGroup2Label.text = getPluralName(fruit2)

            setupFruitContainers(paddedGroup1, paddedGroup2)

            selectedAnswer = null
            binding.tvFeedback.visibility = View.GONE
            binding.imgOwlCheer.setImageResource(R.drawable.lost_owl)

            // Trigger animations if smooth mode is disabled
            val isSmoothMode = getSharedPreferences("add_venture_prefs", MODE_PRIVATE).getBoolean("smooth_mode", false)
            if (!isSmoothMode) {
                binding.tvNum1.fadeInPop(0)
                binding.tvNum2.fadeInPop(80)
                binding.tvAnswer.fadeInPop(160)
                binding.containerGroup1.fadeInPop(240)
                binding.containerGroup2.fadeInPop(320)
            }

            startTimer()
        }

        viewModel.isCorrectAnswer.observe(this) { isCorrect ->
            if (isCorrect == null) {
                binding.tvFeedback.visibility = View.GONE
                binding.imgOwlCheer.setImageResource(R.drawable.lost_owl)
                return@observe
            }

            timer?.cancel()

            val isSmoothMode = getSharedPreferences("add_venture_prefs", MODE_PRIVATE).getBoolean("smooth_mode", false)

            if (isCorrect) {
                val problem = viewModel.currentProblem.value ?: return@observe
                binding.tvAnswer.text = problem.correctAnswer.toString()
                binding.tvFeedback.visibility = View.VISIBLE
                binding.tvFeedback.setTextColor(getColor(R.color.correct_green))
                binding.imgOwlCheer.setImageResource(R.drawable.happy_owl)

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

    private fun setupFruitContainers(group1: List<String>, group2: List<String>) {
        binding.containerGroup1.removeAllViews()
        binding.containerGroup2.removeAllViews()
        binding.containerDropZone.removeAllViews()

        populateFruitContainer(binding.containerGroup1, group1, "group1")
        populateFruitContainer(binding.containerGroup2, group2, "group2")
    }

    private fun populateFruitContainer(container: LinearLayout, fruits: List<String>, groupTag: String) {
        val rowSize = 4
        var currentRow: LinearLayout? = null

        fruits.forEachIndexed { index, fruit ->
            if (index % rowSize == 0) {
                currentRow = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = android.view.Gravity.CENTER
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply {
                        bottomMargin = resources.getDimensionPixelSize(R.dimen.spacing_xs)
                    }
                }
                container.addView(currentRow)
            }

            val fruitView = createFruitView(fruit, groupTag)
            currentRow?.addView(fruitView)
        }
    }

    private fun createFruitView(fruit: String, groupTag: String): TextView {
        return TextView(this).apply {
            text = ""
            gravity = android.view.Gravity.CENTER
            val bgRes = when (fruit) {
                "berry" -> R.drawable.bg_token_berry
                "nut" -> R.drawable.bg_token_nut
                "seed" -> R.drawable.bg_token_seed
                else -> R.drawable.bg_token_berry
            }
            setBackgroundResource(bgRes)
            tag = groupTag

            val size = resources.getDimensionPixelSize(R.dimen.fruit_size)
            val margin = resources.getDimensionPixelSize(R.dimen.spacing_xs)
            layoutParams = LinearLayout.LayoutParams(size, size).apply {
                setMargins(margin, margin, margin, margin)
            }

            setOnTouchListener { view, event ->
                if (event.action == MotionEvent.ACTION_DOWN) {
                    val isInsideDropZone = view.parent?.parent == binding.containerDropZone
                    if (isInsideDropZone) {
                        view.performClick()
                        true
                    } else {
                        val clipData = ClipData.newPlainText("fruit", fruit)
                        val shadow = View.DragShadowBuilder(view)
                        view.startDragAndDrop(clipData, shadow, view, 0)
                        view.performClick()
                        true
                    }
                } else {
                    false
                }
            }
        }
    }

    private fun addViewToContainerWithRows(container: LinearLayout, view: View) {
        val childCount = container.childCount
        var targetRow: LinearLayout? = null
        if (childCount > 0) {
            val lastRow = container.getChildAt(childCount - 1) as? LinearLayout
            if (lastRow != null && lastRow.childCount < 4) {
                targetRow = lastRow
            }
        }

        if (targetRow == null) {
            targetRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    bottomMargin = resources.getDimensionPixelSize(R.dimen.spacing_xs)
                }
            }
            container.addView(targetRow)
        }

        (view.parent as? ViewGroup)?.removeView(view)
        targetRow.addView(view)
    }

    private fun removeViewFromRowParent(view: View) {
        val rowParent = view.parent as? LinearLayout ?: return
        rowParent.removeView(view)
        if (rowParent.childCount == 0) {
            val container = rowParent.parent as? ViewGroup
            container?.removeView(rowParent)
        }
    }

    private fun returnFruitToSource(view: View) {
        val groupTag = view.tag as? String ?: return
        val targetContainer = if (groupTag == "group1") binding.containerGroup1 else binding.containerGroup2

        removeViewFromRowParent(view)
        addViewToContainerWithRows(targetContainer, view)
        view.fadeInPop(0)

        // Clear click listener as it is back in source container
        view.setOnClickListener(null)

        val currentCount = getDroppedFruitsCount()
        binding.tvAnswer.text = if (currentCount > 0) currentCount.toString() else "?"
    }

    private fun getDroppedFruitsCount(): Int {
        var count = 0
        for (i in 0 until binding.containerDropZone.childCount) {
            val row = binding.containerDropZone.getChildAt(i) as? LinearLayout
            if (row != null) {
                count += row.childCount
            }
        }
        return count
    }

    private fun startTimer() {
        timer?.cancel()
        elapsedSeconds = 0
        binding.tvTimer.text = "00:00"

        timer = object : CountDownTimer(300000, 1000) { // 5 min max
            override fun onTick(millisUntilFinished: Long) {
                elapsedSeconds++
                val min = elapsedSeconds / 60
                val sec = elapsedSeconds % 60
                binding.tvTimer.text = String.format("%02d:%02d", min, sec)
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
        val combo = viewModel.comboCount.value ?: 0

        val dialogView = layoutInflater.inflate(R.layout.dialog_correct, null)
        val dialog = MaterialAlertDialogBuilder(this, com.google.android.material.R.style.MaterialAlertDialog_Material3)
            .setView(dialogView)
            .setCancelable(false)
            .create()

        dialog.show()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        val tvComboTitle = dialogView.findViewById<TextView>(R.id.tvComboTitle)
        val tvCorrectTitle = dialogView.findViewById<TextView>(R.id.tvCorrectTitle)
        val tvCorrectStars = dialogView.findViewById<TextView>(R.id.tvCorrectStars)
        val tvComboBadge = dialogView.findViewById<TextView>(R.id.tvComboBadge)
        val btnNext = dialogView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnCorrectNext)

        tvCorrectStars.text = "+$stars Stars"

        if (combo >= 2) {
            tvComboTitle.visibility = View.VISIBLE
            tvComboBadge.visibility = View.VISIBLE
            tvComboBadge.text = "Combo x$combo!"
            
            tvComboTitle.text = when (combo) {
                2 -> "FANTASTIC!"
                3 -> "MAGNIFICENT!"
                4 -> "SPECTACULAR!"
                else -> "UNSTOPPABLE!"
            }

            tvComboTitle.scaleX = 0.5f
            tvComboTitle.scaleY = 0.5f
            tvComboTitle.animate()
                .scaleX(1f)
                .scaleY(1f)
                .setDuration(400)
                .setInterpolator(android.view.animation.OvershootInterpolator())
                .start()
        } else {
            tvComboTitle.visibility = View.GONE
            tvComboBadge.visibility = View.GONE
        }

        btnNext.setOnClickListener {
            dialog.dismiss()
            proceedAfterAnswer()
        }

        val isSmoothMode = getSharedPreferences("add_venture_prefs", MODE_PRIVATE).getBoolean("smooth_mode", false)
        val delay = if (isSmoothMode) 1500L else 2500L
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
        val dialogView = layoutInflater.inflate(R.layout.dialog_retry, null)
        val dialog = MaterialAlertDialogBuilder(this, com.google.android.material.R.style.MaterialAlertDialog_Material3)
            .setView(dialogView)
            .setCancelable(false)
            .create()

        dialog.show()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        val btnTryAgain = dialogView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnDialogTryAgain)
        val btnHint = dialogView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnDialogHint)

        btnTryAgain.setOnClickListener {
            viewModel.retry()
            dialog.dismiss()
        }

        btnHint.setOnClickListener {
            dialog.dismiss()
            val hint = viewModel.useHint()
            showHintDialog(hint)
        }
    }

    private fun loadNewProblem() {
        viewModel.generateNewProblem(ActivityManager.STRATEGY_COUNT_ALL)
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
