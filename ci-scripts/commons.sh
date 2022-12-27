#!/bin/bash -x
set -eu -o pipefail

# CI flags
GITHUB_ACTIONS_ORIGINAL_WORKING_DIR="${PWD}"
GITHUB_ACTIONS_WORKING_DIR="${GITHUB_ACTIONS_WORKING_DIR:-}"
PREPARE=false
PREPARE_KURENTO_SNAPSHOT=false
EXECUTE_ALL=false

# cd to directory if GITHUB_ACTIONS_WORKING_DIR is set
if [[ -n "${GITHUB_ACTIONS_WORKING_DIR:-}" ]]; then
    cd "${GITHUB_ACTIONS_WORKING_DIR}"
fi

# Environment variables
if [[ -n ${1:-} ]]; then
    while :
    do
        case "${1:-}" in
            --prepare )
                PREPARE=true
                shift 1
                ;;
            --prepare-kurento-snapshot )
                PREPARE_KURENTO_SNAPSHOT=true
                shift 1
                ;;
            *)
                break
                ;;
        esac
    done
else
    EXECUTE_ALL=true
fi

# -------------
# 1. Prepare build
# -------------
if [[ "${PREPARE}" == true || "${EXECUTE_ALL}" == true ]]; then

    # Connect e2e test container to network bridge so it is vissible for browser and media server containers
    E2E_CONTAINER_ID="$(docker ps  | grep  'openvidu/openvidu-test-e2e:*' | awk '{ print $1 }')"
    docker network connect bridge "${E2E_CONTAINER_ID}"

    # Pull browser images
    # Pull chrome image if env variable CHROME_VERSION is set
    if [[ -n "${CHROME_VERSION:-}" ]]; then
        docker pull selenium/standalone-chrome:"${CHROME_VERSION}"
    fi
    # Pull firefox image if env variable FIREFOX_VERSION is set
    if [[ -n "${FIREFOX_VERSION:-}" ]]; then
        docker pull selenium/standalone-firefox:"${FIREFOX_VERSION}"
    fi
    # Pull opera image if env variable OPERA_VERSION is set
    if [[ -n "${OPERA_VERSION:-}" ]]; then
        docker pull selenium/standalone-opera:"${OPERA_VERSION}"
    fi
    # Pull edge image if env variable EDGE_VERSION is set
    if [[ -n "${EDGE_VERSION:-}" ]]; then
        docker pull selenium/standalone-edge:"${EDGE_VERSION}"
    fi

    # Pull mediasoup and kurento
    if [[ -n "${MEDIASOUP_CONTROLLER_VERSION:-}" ]]; then
        docker pull openvidu/mediasoup-controller:"${MEDIASOUP_CONTROLLER_VERSION}"
    fi
    if [[ -n "${KURENTO_MEDIA_SERVER_IMAGE:-}" ]]; then
        docker pull "${KURENTO_MEDIA_SERVER_IMAGE}"
    fi

    # Prepare directory Openvidu
    sudo mkdir -p /opt/openvidu/recordings && sudo chmod 777 /opt/openvidu/recordings


    # Configure Snapshots repository
    if [[ -n "${KURENTO_SNAPSHOTS_URL}" ]]; then
        # Cd to GITHUB_ACTIONS_ORIGINAL_WORKING_DIR only if GITHUB_ACTIONS_WORKING_DIR is set
        if [[ -n "${GITHUB_ACTIONS_WORKING_DIR:-}" ]]; then
            pushd "${GITHUB_ACTIONS_ORIGINAL_WORKING_DIR}"/ci-scripts
            curl https://raw.githubusercontent.com/OpenVidu/openvidu/master/ci-scripts/kurento-snapshots.xml -o kurento-snapshots.xml
        else
            pushd ci-scripts
        fi
        sed -i "s|KURENTO_SNAPSHOTS_URL|${KURENTO_SNAPSHOTS_URL}|g" kurento-snapshots.xml
        rm /etc/maven/settings.xml
        mv kurento-snapshots.xml /etc/maven/settings.xml
        popd
    fi

    # Download fake videos
    FAKE_VIDEO1=/opt/openvidu/barcode.y4m
    FAKE_VIDEO2=/opt/openvidu/girl.mjpeg
    if [ ! -f ${FAKE_VIDEO1} ]; then
        sudo curl --location https://github.com/OpenVidu/openvidu/raw/master/openvidu-test-e2e/docker/barcode.y4m --create-dirs --output /opt/openvidu/barcode.y4m
    else
        echo "File ${FAKE_VIDEO1} already exists"
    fi
    if [ ! -f ${FAKE_VIDEO2} ]; then
        sudo curl --location https://github.com/OpenVidu/openvidu/raw/master/openvidu-test-e2e/docker/girl.mjpeg --create-dirs --output /opt/openvidu/girl.mjpeg
    else
        echo "File ${FAKE_VIDEO2} already exists"
    fi

    # Download fake audios
    FAKE_AUDIO1=/opt/openvidu/fakeaudio.wav
    FAKE_AUDIO2=/opt/openvidu/stt-test.wav
    if [ ! -f ${FAKE_AUDIO1} ]; then
        sudo curl --location https://github.com/OpenVidu/openvidu/raw/master/openvidu-test-e2e/docker/fakeaudio.wav --create-dirs --output /opt/openvidu/fakeaudio.wav
    else
        echo "File ${FAKE_AUDIO1} already exists"
    fi
    if [ ! -f ${FAKE_AUDIO2} ]; then
        sudo curl --location https://github.com/OpenVidu/openvidu/raw/master/openvidu-test-e2e/docker/stt-test.wav --create-dirs --output /opt/openvidu/stt-test.wav
    else
        echo "File ${FAKE_AUDIO2} already exists"
    fi

    # Download recording custom layout
    sudo curl --location https://raw.githubusercontent.com/OpenVidu/openvidu/master/openvidu-test-e2e/docker/my-custom-layout/index.html --create-dirs --output /opt/openvidu/test-layouts/layout1/index.html

    # Open permissions for /opt/openvidu folder
    chmod -R 777 /opt/openvidu

fi

# -------------
# 2. Prepare Kurento Snapshots
# -------------
if [[ "${PREPARE_KURENTO_SNAPSHOT}" == true || "${EXECUTE_ALL}" == true ]]; then

    # Prepare Kurento Snapshot if it is configured
    if [[ $KURENTO_JAVA_COMMIT != "default" ]]; then
        git clone https://github.com/Kurento/kurento-java.git
        pushd kurento-java
        git checkout -f "$KURENTO_JAVA_COMMIT"
        mvn -B -Dmaven.artifact.threads=1 clean install
        popd
    fi

fi