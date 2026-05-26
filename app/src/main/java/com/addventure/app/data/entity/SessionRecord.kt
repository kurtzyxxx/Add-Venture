package com.addventure.app.data.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "session_record")
data class SessionRecord(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val learnerId: Long = 1,
    val totalActivities: Int = 0,
    val totalCorrect: Int = 0,
    val totalStars: Int = 0,
    val averageAccuracy: Float = 0f,
    val averageResponseTimeMs: Long = 0,
    val durationMs: Long = 0,
    val startedAt: Long = System.currentTimeMillis(),
    val endedAt: Long? = null
)
