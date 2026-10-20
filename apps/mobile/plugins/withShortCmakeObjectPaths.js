const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * React Native compiles each native library's C++ with CMake, which names object files after their full source
 * path (…/C_/<repo>/node_modules/react-native-screens/common/cpp/…/File.cpp.o). On Windows that passes the
 * 260-character path limit, and ninja fails with "Filename longer than 260 characters". CMake shortens object
 * paths past CMAKE_OBJECT_PATH_MAX by hashing their directories, but Android builds don't get the Windows default,
 * so it's set here, just under the limit (a lower value leaves no room for the hash, and CMake gives up).
 * The hash still has to fit after the project folder, so keep the repo path short (C:\dev\WorkoutAssistant).
 * android/ is generated, so this is applied on every prebuild.
 */
module.exports = function withShortCmakeObjectPaths(config) {
  return withAppBuildGradle(config, (cfg) => {
    const gradle = cfg.modResults.contents;
    if (!gradle.includes('CMAKE_OBJECT_PATH_MAX')) {
      cfg.modResults.contents = gradle.replace(
        /defaultConfig\s*\{/,
        (m) => `${m}\n        externalNativeBuild {\n            cmake {\n                arguments "-DCMAKE_OBJECT_PATH_MAX=255"\n            }\n        }`,
      );
    }
    return cfg;
  });
};
