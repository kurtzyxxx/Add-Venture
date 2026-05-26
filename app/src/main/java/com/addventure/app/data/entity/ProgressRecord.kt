package com.addventure.app.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "progress_record")
data class ProgressRecord(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val learnerId: Long = 1,
    val strategy: String, // "COUNT_ALL", "COUNT_ON", "NUMBER_BONDS"
    val completedActivities: Int = 0,
    val totalCorrect: Int = 0,
    val totalAttempts: Int = 0,
    val unlockedLevel: Int = 1,
    val starsEarned: Int = 0,
    val lastUpdated: Long = System.currentTimeMillis()
)
