document.addEventListener('DOMContentLoaded', () => {
    const userNameInput = document.getElementById('userName');
    const faceImageInput = document.getElementById('faceImage');
    const diagnoseButton = document.getElementById('diagnoseButton');
    const resultDisplay = document.getElementById('resultDisplay');
    const passwordInput = document.getElementById('passwordInput');
    const retrieveDataButton = document.getElementById('retrieveDataButton');
    const savedDataDisplay = document.getElementById('savedDataDisplay');

    // AI診断ボタンのクリックイベント
    diagnoseButton.addEventListener('click', async () => {
        const userName = userNameInput.value.trim();
        const faceImage = faceImageInput.files[0];

        if (!userName) {
            alert('名前を入力してください。');
            return;
        }
        if (!faceImage) {
            alert('顔写真を選択してください。');
            return;
        }

        resultDisplay.innerHTML = '<p>診断中...</p>';
        const formData = new FormData();
        formData.append('userName', userName);
        formData.append('faceImage', faceImage);

        try {
            const response = await fetch('http://127.0.0.1:5000/diagnose', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '診断に失敗しました。');
            }

            const data = await response.json();
            resultDisplay.innerHTML = `<p>${data.result}</p>`;
        } catch (error) {
            console.error('診断エラー:', error);
            resultDisplay.innerHTML = `<p style="color: red;">エラー: ${error.message}</p>`;
        }
    });

    // データ取得ボタンのクリックイベント
    retrieveDataButton.addEventListener('click', async () => {
        const password = passwordInput.value;

        if (!password) {
            alert('パスワードを入力してください。');
            return;
        }

        savedDataDisplay.innerHTML = '<p>データを取得中...</p>';

        try {
            const response = await fetch('http://127.0.0.1:5000/retrieve_data', {
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
