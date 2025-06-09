import os
import json
import random
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from datetime import datetime
import base64
from PIL import Image
import io

app = Flask(__name__)
# フロントエンドが異なるオリジンからアクセスできるようにCORSを設定
CORS(app)

UPLOAD_FOLDER = 'uploads'
DATA_FILE = 'data.json'
PASSWORD = 'your_secure_password' # ここを実際のパスワードに変更してください！

# アップロードフォルダが存在しない場合は作成
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# data.jsonファイルが存在しない場合は作成
if not os.path.exists(DATA_FILE):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f, ensure_ascii=False, indent=2)

@app.route('/diagnose', methods=['POST'])
def diagnose_face():
    """
    顔診断を実行し、ユーザー名と画像を保存します。
    """
    if 'userName' not in request.form:
        return jsonify({'error': '名前が提供されていません。'}), 400
    if 'faceImage' not in request.files:
        return jsonify({'error': '画像ファイルが提供されていません。'}), 400

    user_name = request.form['userName']
    face_image = request.files['faceImage']

    # ファイル名を安全に処理し、ユニークにする
    filename = secure_filename(f"{user_name}_{int(datetime.now().timestamp())}_{face_image.filename}")
    image_path = os.path.join(UPLOAD_FOLDER, filename)
    face_image.save(image_path)

    # データをdata.jsonに保存
    try:
        with open(DATA_FILE, 'r+', encoding='utf-8') as f:
            data = json.load(f)
            data.append({
                'userName': user_name,
                'imagePath': image_path
            })
            f.seek(0) # ファイルの先頭に戻る
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.truncate() # 古い内容を削除
    except Exception as e:
        return jsonify({'error': f'データの保存中にエラーが発生しました: {e}'}), 500

    # AI診断結果をランダムに生成 (30〜80の範囲)
    diagnosis_score = random.randint(30, 80)
    diagnosis_result = f"あなたの顔診断結果は {diagnosis_score} 点です！"

    return jsonify({
        'result': diagnosis_result,
        'score': diagnosis_score
    })

@app.route('/retrieve_data', methods=['POST'])
def retrieve_data():
    """
    パスワード認証後、保存されたユーザー名と画像データを返します。
    """
    data = request.get_json()
    if not data or 'password' not in data:
        return jsonify({'error': 'パスワードが提供されていません。'}), 400

    input_password = data['password']

    if input_password != PASSWORD:
        return jsonify({'error': 'パスワードが間違っています。'}), 401

    # data.jsonからデータを読み込み、画像データをBase64エンコードして返す
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            stored_data = json.load(f)

        results = []
        for entry in stored_data:
            user_name = entry['userName']
            image_path = entry['imagePath']

            if os.path.exists(image_path):
                # 画像をBase64エンコード
                with Image.open(image_path) as img:
                    buffered = io.BytesIO()
                    # JPEG形式で保存するが、元の拡張子を考慮しても良い
                    img.save(buffered, format="JPEG")
                    img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
                    results.append({
                        'userName': user_name,
                        'image': f"data:image/jpeg;base64,{img_str}" # HTMLで表示できるようにデータURI形式で
                    })
            else:
                results.append({
                    'userName': user_name,
                    'image': '画像が見つかりません。'
                })
        return jsonify(results)
    except Exception as e:
        return jsonify({'error': f'データの取得中にエラーが発生しました: {e}'}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """
    アップロードされた画像ファイルを直接提供するためのエンドポイント (デバッグ用、本番では別の方法を推奨)
    """
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000) # デバッグモードでポート5000で実行
