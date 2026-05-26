package com.addventure.app

import android.app.Application
import com.addventure.app.data.database.AddVentureDatabase

class AddVentureApp : Application() {

    val database: AddVentureDatabase by lazy {
        AddVentureDatabase.getInstance(this)
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    companion object {
        lateinit var instance: AddVentureApp
            private set
    }
}
