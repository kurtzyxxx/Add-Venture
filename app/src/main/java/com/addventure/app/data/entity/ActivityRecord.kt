package com.addventure.app.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "activity_record")
data class ActivityRecord(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val learnerId: Long = 1,
    val activityType: String, // "COUNT_ALL", "COUNT_ON", "NUMBER_BONDS"
    val activityLevel: Int,
    val questionNum1: Int,
    val questionNum2: Int,
    val correctAnswer: Int,
    val learnerAnswer: Int,
    val isCorrect: Boolean,
    val responseTimeMs: Long,
    val starsEarned: Int,
    val difficulty: Int,
    val hintsUsed: Int = 0,
    val retryCount: Int = 0,
    val sessionId: Long,
    val timestamp: Long = System.currentTimeMillis()
)
