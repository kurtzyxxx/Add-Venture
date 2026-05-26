package com.addventure.app.data.dao

import androidx.lifecycle.LiveData
import androidx.room.*
import com.addventure.app.data.entity.LearnerProfile

@Dao
interface LearnerDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(profile: LearnerProfile): Long

    @Update
    suspend fun update(profile: LearnerProfile)

    @Query("SELECT * FROM learner_profile WHERE id = :id")
    suspend fun getById(id: Long): LearnerProfile?

    @Query("SELECT * FROM learner_profile WHERE id = 1")
    fun getDefaultLearner(): LiveData<LearnerProfile?>

    @Query("SELECT * FROM learner_profile WHERE id = 1")
    suspend fun getDefaultLearnerSync(): LearnerProfile?

    @Query("UPDATE learner_profile SET totalStars = totalStars + :stars WHERE id = :id")
    suspend fun addStars(id: Long, stars: Int)

    @Query("UPDATE learner_profile SET overallProgress = :progress WHERE id = :id")
    suspend fun updateProgress(id: Long, progress: Float)

    @Query("UPDATE learner_profile SET currentDifficulty = :difficulty, consecutiveCorrect = :correct, consecutiveWrong = :wrong WHERE id = :id")
    suspend fun updateDifficulty(id: Long, difficulty: Int, correct: Int, wrong: Int)
}
