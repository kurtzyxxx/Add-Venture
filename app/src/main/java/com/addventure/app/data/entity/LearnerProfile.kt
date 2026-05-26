package com.addventure.app.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "learner_profile")
data class LearnerProfile(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String = "Learner",
    val totalStars: Int = 0,
    val overallProgress: Float = 0f,
    val currentDifficulty: Int = 1, // 1=Easy, 2=Medium, 3=Hard
    val consecutiveCorrect: Int = 0,
    val consecutiveWrong: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)
