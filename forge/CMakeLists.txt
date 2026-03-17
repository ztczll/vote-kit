cmake_minimum_required(VERSION 3.16)
project(forge-engine)

# Set Go version requirement
set(GO_VERSION "1.24")

# Find Go
find_program(GO_EXECUTABLE go REQUIRED)

# Get Go version
execute_process(
    COMMAND ${GO_EXECUTABLE} version
    OUTPUT_VARIABLE GO_VERSION_OUTPUT
    OUTPUT_STRIP_TRAILING_WHITESPACE
)

# Set build type
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Set installation directories
set(CMAKE_INSTALL_PREFIX "/usr/local" CACHE PATH "Installation prefix")
set(INSTALL_BINDIR "bin" CACHE PATH "Binary installation directory")
set(INSTALL_CONFIGDIR "etc/forge" CACHE PATH "Configuration installation directory")
set(INSTALL_LOGDIR "/var/log/forge" CACHE PATH "Log directory")
set(INSTALL_SYSTEMDDIR "/etc/systemd/system" CACHE PATH "Systemd service directory")

# Go build flags
set(GO_BUILD_FLAGS "-ldflags=-s -w" CACHE STRING "Go build flags")

# Define executables
set(FORGE_EXECUTABLES
    forge
    export-server
    demo
)

# Build Go executables
foreach(EXECUTABLE ${FORGE_EXECUTABLES})
    add_custom_target(${EXECUTABLE}
        COMMAND ${GO_EXECUTABLE} build ${GO_BUILD_FLAGS} -o ${CMAKE_BINARY_DIR}/${EXECUTABLE} ./cmd/${EXECUTABLE}
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        COMMENT "Building ${EXECUTABLE}"
    )
endforeach()

# Build all executables
add_custom_target(all_executables ALL
    DEPENDS ${FORGE_EXECUTABLES}
)

# Install executables
foreach(EXECUTABLE ${FORGE_EXECUTABLES})
    install(PROGRAMS ${CMAKE_BINARY_DIR}/${EXECUTABLE}
        DESTINATION ${INSTALL_BINDIR}
    )
endforeach()

# Create log directories
install(DIRECTORY DESTINATION ${INSTALL_LOGDIR}/forge-engine)
install(DIRECTORY DESTINATION ${INSTALL_LOGDIR}/forge-export)

# Install configuration files
install(FILES config/config.yaml.example
    DESTINATION ${INSTALL_CONFIGDIR}
    RENAME config.yaml
    OPTIONAL
)

# Install systemd service files
install(FILES 
    systemd/forge-engine.service
    systemd/forge-export.service
    DESTINATION ${INSTALL_SYSTEMDDIR}
    OPTIONAL
)

# Package configuration
set(CPACK_PACKAGE_NAME "forge-engine")
set(CPACK_PACKAGE_VERSION "1.0.0")
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Forge Engine - AI-powered application generator")
set(CPACK_PACKAGE_VENDOR "Forge Team")
set(CPACK_PACKAGE_CONTACT "forge@example.com")

# DEB package configuration
set(CPACK_DEBIAN_PACKAGE_DEPENDS "")
set(CPACK_DEBIAN_PACKAGE_SECTION "devel")
set(CPACK_DEBIAN_PACKAGE_PRIORITY "optional")

# RPM package configuration  
set(CPACK_RPM_PACKAGE_REQUIRES "")
set(CPACK_RPM_PACKAGE_GROUP "Development/Tools")

include(CPack)

# Print build information
message(STATUS "Go executable: ${GO_EXECUTABLE}")
message(STATUS "Go version: ${GO_VERSION_OUTPUT}")
message(STATUS "Build type: ${CMAKE_BUILD_TYPE}")
message(STATUS "Install prefix: ${CMAKE_INSTALL_PREFIX}")
