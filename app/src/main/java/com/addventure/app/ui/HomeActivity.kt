package com.addventure.app.ui

import android.content.Intent
import android.os.Bundle
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.addventure.app.databinding.ActivityHomeBinding
import com.addventure.app.logic.ActivityManager
import com.addventure.app.viewmodel.ActivityViewModel
import com.addventure.app.R

class HomeActivity : AppCompatActivity() {

    private lateinit var binding: ActivityHomeBinding
    private val viewModel: ActivityViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupUI()
        observeData()
    }

    private fun setupUI() {
        // Strategy card click listeners
        binding.cardCountAll.setOnClickListener {
            startGameActivity(ActivityManager.STRATEGY_COUNT_ALL)
        }

        binding.cardCountOn.setOnClickListener {
            startGameActivity(ActivityManager.STRATEGY_COUNT_ON)
        }

        binding.cardNumberBonds.setOnClickListener {
            startGameActivity(ActivityManager.STRATEGY_NUMBER_BONDS)
        }

        // Adventure map
        binding.btnAdventureMap.setOnClickListener {
            startActivity(Intent(this, AdventureMapActivity::class.java))
        }

        // Bottom navigation
        binding.bottomNav.selectedItemId = R.id.nav_home
        binding.bottomNav.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_home -> true
                R.id.nav_progress -> {
                    startActivity(Intent(this, ProgressActivity::class.java))
                    true
                }
                else -> false
            }
        }

        // Animate cards on entry
        animateCardsEntry()
    }

    private fun observeData() {
        viewModel.learnerProfile.observe(this) { profile ->
            profile?.let {
                binding.tvTotalStars.text = it.totalStars.toString()
            }
        }
    }

    private fun startGameActivity(strategy: String) {
        val intent = when (strategy) {
            ActivityManager.STRATEGY_COUNT_ALL -> Intent(this, CountAllActivity::class.java)
            ActivityManager.STRATEGY_COUNT_ON -> Intent(this, CountOnActivity::class.java)
            ActivityManager.STRATEGY_NUMBER_BONDS -> Intent(this, NumberBondsActivity::class.java)
            else -> return
        }
        intent.putExtra("STRATEGY", strategy)
        startActivity(intent)
    }

    private fun animateCardsEntry() {
        val cards = listOf(binding.cardCountAll, binding.cardCountOn, binding.cardNumberBonds)
        cards.forEachIndexed { index, card ->
            card.alpha = 0f
            card.translationX = 200f
            card.animate()
                .alpha(1f)
                .translationX(0f)
                .setDuration(400)
                .setStartDelay((index * 100).toLong())
                .start()
        }

        binding.btnAdventureMap.alpha = 0f
        binding.btnAdventureMap.translationY = 50f
        binding.btnAdventureMap.animate()
            .alpha(1f)
            .translationY(0f)
            .setDuration(400)
            .setStartDelay(400)
            .start()
    }

    override fun onResume() {
        super.onResume()
        binding.bottomNav.selectedItemId = R.id.nav_home
    }
}
