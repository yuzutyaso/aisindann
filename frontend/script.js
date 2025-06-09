document.addEventListener('DOMContentLoaded', () => {
    const userNameInput = document.getElementById('userName');
    const diagnoseButton = document.getElementById('diagnoseButton');
    const resultDisplay = document.getElementById('resultDisplay');
    const passwordInput = document.getElementById('passwordInput');
    const retrieveDataButton = document.getElementById('retrieveDataButton');
    const savedDataDisplay = document.getElementById('savedDataDisplay');

    // Webカメラ関連の要素
    const videoElement = document.getElementById('videoElement');
    const takePhotoButton = document.getElementById('takePhotoButton');
    const canvasElement = document.getElementById('canvasElement');
    const capturedImage = document.getElementById('capturedImage');
    const imageStatus = document.getElementById('imageStatus');
    let stream; // カメラのストリームを保持
    let photoTaken = false; // 写真が撮影されたかどうかのフラグ

    // --- Webカメラの初期化 ---
    async function setupCamera() {
        try {
            // ユーザーのメディアデバイス（カメラ）へのアクセスを要求
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoElement.srcObject = stream;
            imageStatus.textContent = 'カメラ準備完了。写真を撮ってください。';
            takePhotoButton.disabled = false; // カメラが準備できたらボタンを有効化
        } catch (err) {
            console.error("Webカメラへのアクセスに失敗しました:", err);
            imageStatus.textContent = 'カメラへのアクセスが拒否されたか、利用できません。';
            takePhotoButton.disabled = true; // エラー時はボタンを無効化
            alert('Webカメラへのアクセスが必要です。ブラウザの設定で許可してください。');
        }
    }

    // ページの読み込み時にカメラをセットアップ
    setupCamera();

    // --- 写真撮影ボタンのクリックイベント ---
    takePhotoButton.addEventListener('click', () => {
        if (!stream) {
            alert('カメラが利用できません。');
            return;
        }

        const context = canvasElement.getContext('2d');
        // canvasのサイズをvideo要素に合わせる
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;

        // videoの現在のフレームをcanvasに描画
        context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

        // canvasから画像データを取得 (Base64形式)
        const imageDataURL = canvasElement.toDataURL('image/jpeg'); // JPEG形式で取得

        // 取得した画像を表示
        capturedImage.src = imageDataURL;
        capturedImage.style.display = 'block';
        imageStatus.textContent = '写真が撮影されました。';
        photoTaken = true; // 写真が撮影されたことを示すフラグを設定

        // 診断ボタンのテキストを変更（分かりやすく）
        diagnoseButton.textContent = '撮影した写真でAI診断を開始';
    });


    // --- AI診断ボタンのクリックイベント ---
    diagnoseButton.addEventListener('click', async () => {
        const userName = userNameInput.value.trim();
        const capturedImageURL = capturedImage.src; // 撮影した画像のデータURL

        if (!userName) {
            alert('名前を入力してください。');
            return;
        }
        if (!photoTaken || !capturedImageURL || capturedImageURL === '') {
            alert('まず顔写真を撮影してください。');
            return;
        }

        resultDisplay.innerHTML = '<p>診断中...</p>';
        const formData = new FormData();
        formData.append('userName', userName);

        // Base64データURLをBlobに変換してFormDataに追加
        // fetch APIでBlobを送信できるようにする
        const response = await fetch(capturedImageURL);
        const blob = await response.blob();
        formData.append('faceImage', blob, 'face_capture.jpeg'); // ファイル名も指定

        try {
            // Vercelデプロイ用にURLを相対パスに変更
            const apiResponse = await fetch('/api/diagnose', {
                method: 'POST',
                body: formData,
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.error || '診断に失敗しました。');
            }

            const data = await apiResponse.json();
            resultDisplay.innerHTML = `<p>${data.result}</p>`;
        } catch (error) {
            console.error('診断エラー:', error);
            resultDisplay.innerHTML = `<p style="color: red;">エラー: ${error.message}</p>`;
        }
    });

    // --- データ取得ボタンのクリックイベント (変更なし) ---
    retrieveDataButton.addEventListener('click', async () => {
        const password = passwordInput.value;

        if (!password) {
            alert('パスワードを入力してください。');
            return;
        }

        savedDataDisplay.innerHTML = '<p>データを取得中...</p>';

        try {
            // Vercelデプロイ用にURLを相対パスに変更
            const response = await fetch('/api/retrieve_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password: password }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'データの取得に失敗しました。');
            }

            const data = await response.json();
            if (data.length === 0) {
                savedDataDisplay.innerHTML = '<p>保存されたデータはありません。</p>';
                return;
            }

            savedDataDisplay.innerHTML = ''; // クリア
            data.forEach(item => {
                const dataItemDiv = document.createElement('div');
                dataItemDiv.classList.add('saved-data-item');

                const nameParagraph = document.createElement('p');
                nameParagraph.textContent = `名前: ${item.userName}`;
                dataItemDiv.appendChild(nameParagraph);

                if (item.image && item.image.startsWith('data:image/')) {
                    const imgElement = document.createElement('img');
                    imgElement.src = item.image;
                    imgElement.alt = `${item.userName}の顔写真`;
                    dataItemDiv.appendChild(imgElement);
                } else {
                    const noImageParagraph = document.createElement('p');
                    noImageParagraph.textContent = '画像が利用できません。';
                    dataItemDiv.appendChild(noImageParagraph);
                }
                savedDataDisplay.appendChild(dataItemDiv);
            });

        } catch (error) {
            console.error('データ取得エラー:', error);
            savedDataDisplay.innerHTML = `<p style="color: red;">エラー: ${error.message}</p>`;
        }
    });
});
