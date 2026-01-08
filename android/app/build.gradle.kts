// Top of the file: Import statements and logic to read key.properties
import java.util.Properties
import java.io.FileInputStream

// Use a direct relative path to avoid context issues in the runner
val keyPropertiesFile = file("../key.properties")
val keyProperties = Properties()
var hasKeyProperties = false

if (keyPropertiesFile.exists()) {
    keyProperties.load(FileInputStream(keyPropertiesFile))
    hasKeyProperties = true
    // Validate required keys only when the file exists
    listOf("storePassword", "keyPassword", "keyAlias", "storeFile").forEach {
        if (keyProperties[it] == null || (keyProperties[it] as String).isBlank()) {
            throw GradleException("'$it' is missing or empty in 'android/key.properties'. Please add it.")
        }
    }
} else {
    // Don't fail the build for local debug runs. Emit a warning so the developer knows.
    logger.warn("Could not find 'key.properties' in the 'android' directory. Release signing will be skipped for local builds. Expected path: ${keyPropertiesFile.absolutePath}")
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

    // Add signingConfigs only when key.properties exists (used for release builds)
    if (hasKeyProperties) {
        signingConfigs {
            create("release") {
                keyAlias = keyProperties["keyAlias"] as String
                keyPassword = keyProperties["keyPassword"] as String
                storeFile = file(keyProperties["storeFile"] as String)
                storePassword = keyProperties["storePassword"] as String
            }
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
            // Point to the signing config if available and add ProGuard rules
            if (hasKeyProperties) {
                signingConfig = signingConfigs.getByName("release")
            }
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

flutter {
    source = "../.."
}
