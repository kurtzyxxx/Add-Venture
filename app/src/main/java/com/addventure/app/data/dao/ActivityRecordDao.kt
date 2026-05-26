package com.addventure.app.data.dao

import androidx.lifecycle.LiveData
import androidx.room.*
import com.addventure.app.data.entity.ActivityRecord

@Dao
interface ActivityRecordDao {

    @Insert
    suspend fun insert(record: ActivityRecord): Long

    @Query("SELECT * FROM activity_record WHERE learnerId = :learnerId ORDER BY timestamp DESC")
    fun getAllByLearner(learnerId: Long): LiveData<List<ActivityRecord>>

    @Query("SELECT * FROM activity_record WHERE sessionId = :sessionId ORDER BY timestamp ASC")
    suspend fun getBySession(sessionId: Long): List<ActivityRecord>

    @Query("SELECT * FROM activity_record WHERE learnerId = :learnerId AND activityType = :type ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getRecentByType(learnerId: Long, type: String, limit: Int): List<ActivityRecord>

    @Query("SELECT COUNT(*) FROM activity_record WHERE learnerId = :learnerId AND activityType = :type AND isCorrect = 1")
    suspend fun getCorrectCount(learnerId: Long, type: String): Int

    @Query("SELECT COUNT(*) FROM activity_record WHERE learnerId = :learnerId AND activityType = :type")
    suspend fun getTotalCount(learnerId: Long, type: String): Int

    @Query("SELECT AVG(responseTimeMs) FROM activity_record WHERE sessionId = :sessionId")
    suspend fun getAverageResponseTime(sessionId: Long): Long?
}
