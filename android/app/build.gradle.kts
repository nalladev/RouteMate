// Top of the file: Import statements and logic to read key.properties
import java.util.Properties
import java.io.FileInputStream

// Use a direct relative path to avoid context issues in the runner
val keyPropertiesFile = file("../key.properties")
val keyProperties = Properties()

if (!keyPropertiesFile.exists()) {
    // Updated error message for clarity
    throw GradleException("Could not find 'key.properties' in the 'android' directory. The file was not found at the expected path: ${keyPropertiesFile.absolutePath}")
}

keyProperties.load(FileInputStream(keyPropertiesFile))

listOf("storePassword", "keyPassword", "keyAlias", "storeFile").forEach {
    if (keyProperties[it] == null || (keyProperties[it] as String).isBlank()) {
        throw GradleException("'$it' is missing or empty in 'android/key.properties'. Please add it.")
    }
}

// Main build script content
plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.routemate.app"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = "27.0.12077973"

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    // Add this signingConfigs block
    signingConfigs {
        create("release") {
            keyAlias = keyProperties["keyAlias"] as String
            keyPassword = keyProperties["keyPassword"] as String
            storeFile = file(keyProperties["storeFile"] as String)
            storePassword = keyProperties["storePassword"] as String
        }
    }

    defaultConfig {
        applicationId = "com.routemate.app"
        minSdk = 23
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    buildTypes {
        release {
            // Point to the signing config and add ProGuard rules
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

flutter {
    source = "../.."
}
