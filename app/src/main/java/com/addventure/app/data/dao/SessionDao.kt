package com.addventure.app.data.dao

import androidx.room.*
import com.addventure.app.data.entity.SessionRecord

@Dao
interface SessionDao {

    @Insert
    suspend fun insert(session: SessionRecord): Long

    @Update
    suspend fun update(session: SessionRecord)

    @Query("SELECT * FROM session_record WHERE id = :id")
    suspend fun getById(id: Long): SessionRecord?

    @Query("SELECT * FROM session_record WHERE learnerId = :learnerId ORDER BY startedAt DESC LIMIT 1")
    suspend fun getLatestSession(learnerId: Long): SessionRecord?

    @Query("SELECT * FROM session_record WHERE learnerId = :learnerId ORDER BY startedAt DESC")
    suspend fun getAllByLearner(learnerId: Long): List<SessionRecord>
}
