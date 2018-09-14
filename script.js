onload = function(){
    // canvasエレメントを取得
	var c = document.getElementById('canvas');
	//c.width = 1000;
	//c.height = 600;
	c.width = window.innerWidth;
	/*
	if (window.innerWidth > 1500) {
		c.width = 1500;
	} else {
		c.width = window.innerWidth;
	}*/
	//c.width = window.innerWidth;
	c.height = 0.4 * window.innerWidth;
	
	var cam = document.getElementById('camera');
	//cam.size = 1000;

	var rot = document.getElementById('rot');
	rot.size = 1000;
	
	var disp_amp = document.getElementById('disp_amp');
	disp_amp.size = 300;
	
	var force_range = document.getElementById('force_range');
	force_range.size = 300;

	var speed = document.getElementById('speed');
	speed.size = 300;
	
	// webglコンテキストを取得
	var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
	
	// 頂点シェーダとフラグメントシェーダの生成
	var v_shader = create_shader('vs');
	var f_shader = create_shader('fs');
	
	// プログラムオブジェクトの生成とリンク
	var prg = create_program(v_shader, f_shader);
	
	// attributeLocationを配列に取得
	var attLocation = new Array();
	attLocation[0] = gl.getAttribLocation(prg, 'position');
	attLocation[1] = gl.getAttribLocation(prg, 'disp1');
	attLocation[2] = gl.getAttribLocation(prg, 'disp2');
	attLocation[3] = gl.getAttribLocation(prg, 'frc1');
	attLocation[4] = gl.getAttribLocation(prg, 'frc2');
	//attLocation[1] = gl.getAttribLocation(prg, 'normal');
	//attLocation[2] = gl.getAttribLocation(prg, 'textureCoord');
	console.log('attLocation = ', attLocation[3]);
	
	// attributeの要素数を配列に格納
	var attStride = new Array();
	attStride[0] = 3;
	attStride[1] = 3;
	attStride[2] = 3;
	attStride[3] = 3;
	attStride[4] = 3;
	//attStride[1] = 3;
	//attStride[2] = 2;
	
	var VBOList = new Array();
	var numLoop = new Array();
	var iIndex = new Array();

	//numLoop.push(4)
	//co = [0.0, 0.0, 0.0, 0.1, 0.1, 0.1, 0.2, 0.2, 0.2, 0.3, 0.3, 0.3];
	//var position = co;
	//var index = [0, 1, 2, 3];
	//var vPosition = create_vbo(position);
	//VBOList.push([vPosition]);
	//iIndex.push(create_ibo(index));
	
	var models = [
	'kur1.csv'
	];
	var nlc = new Array();
	var lp = new Array();
	for (var i in models) {
		//console.log(models[i]);
		var obData = csv2Data(models[i]);

		numLoop.push(obData[0]);
		var position = obData[1];
		nlc.push(obData[2]);
		lp.push(obData[3]);
		var disp = obData[4];
		var frc = obData[5];
		console.log('frc = ', frc[50]);
		//var normal = obData[2];
		//var textureCoord = obData[3];

		var index = new Array();
		for (var i = 0; i < obData[0];++i) {
			index.push(i);
		}

		var vPosition = create_vbo(position);
		var vDisp1 = create_vbo(disp);
		var vDisp2 = create_vbo(disp);
		var vFrc1 = create_vbo(frc);
		var vFrc2 = create_vbo(frc);
		//var vNormal       = create_vbo(normal);
		//var vTextureCoord = create_vbo(textureCoord);
		//VBOList.push([vPosition, vNormal, vTextureCoord]);
		VBOList.push([vPosition, vDisp1, vDisp2, vFrc1, vFrc2]);
		iIndex.push(create_ibo(index));
	}
	//console.log(lp[0][1], lp[0][1] * 2.0);

	//var color = [1.0, 0.5, 0.5, 1.0];
	
	var color = [
	[0.0, 0.0, 0.0, 1.0]
	];
	
    
	// uniformLocationを配列に取得
	var uniLocation = new Array();
	uniLocation[0] = gl.getUniformLocation(prg, 'color');
	uniLocation[1] = gl.getUniformLocation(prg, 'mvpMatrix');
	uniLocation[2] = gl.getUniformLocation(prg, 'r1');
	uniLocation[3] = gl.getUniformLocation(prg, 'r2');
	uniLocation[4] = gl.getUniformLocation(prg, 'disp_amp');
	uniLocation[5] = gl.getUniformLocation(prg, 'force_range');
	//uniLocation[2] = gl.getUniformLocation(prg, 'invMatrix');
	//uniLocation[3] = gl.getUniformLocation(prg, 'lightDirection');
	//uniLocation[4] = gl.getUniformLocation(prg, 'eyeDirection');
	//uniLocation[5] = gl.getUniformLocation(prg, 'ambientColor');
	//uniLocation[6] = gl.getUniformLocation(prg, 'texture');
	
	//gl.uniform4fv(uniLocation[0], color);
    
	// 各種行列の生成と初期化
	var m = new matIV();
	var mMatrix   = m.identity(m.create());//モデルマトリクス
	var vMatrix   = m.identity(m.create());//ビューマトリクス
	var pMatrix   = m.identity(m.create());//プロジェクションマトリクス
	var tmpMatrix = m.identity(m.create());//ビュー・プロジェクションマトリクス
	var mvpMatrix = m.identity(m.create());//モデル・ビュー・プロジェクションマトリクス
	//var invMatrix = m.identity(m.create());
	//var tMatrix0 = m.identity(m.create());
	var tMatrix = m.identity(m.create());//モデルマトリクス変換用マトリクス

	var q = new qtnIV();
	//var mQtn	  = q.identity(q.create());
    
	// ビュー×プロジェクション座標変換行列
	/*
	m.lookAt([0.0, 1.0, 3.0], [0, 0, 0], [0, 1, 0], vMatrix);
	m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);
	m.multiply(pMatrix, vMatrix, tmpMatrix);
	*/
	//console.log(camData[1]);
	//var camRotMatrix = m.identity(m.create());
	//q.toMatIV([camData[1][1], camData[1][2], camData[1][3], camData[1][0]], camRotMatrix);
	//m.translate(vMatrix, camData[0], vMatrix);
	m.rotate(vMatrix, -0.5 * Math.PI, [1.0, 0.0, 0.0], vMatrix)
	m.translate(vMatrix, [0.0, 800.0, 0.0], vMatrix);
	//m.translate(vMatrix, [-440.0, 800.0, 0.0], vMatrix);
	//m.multiply(camRotMatrix, vMatrix, vMatrix);
	//m.perspective(camData[2] * 180.0 / Math.PI, c.width / c.height, 0.01, 100, pMatrix);
	//m.perspective(180.0 / Math.PI, c.width / c.height, 0.01, 5000, pMatrix);
	m.ortho(-0.5 * c.width, 0.5 * c.width, 0.5 * c.height, -0.5 * c.height, 0.01, 5000, pMatrix);
	m.multiply(pMatrix, vMatrix, tmpMatrix);
	
	m.translate(mMatrix, [-440.0, 0.0, 0.0], mMatrix);
	
	// 平行光源の向き
	//var lightDirection = [-0.5, 0.5, 0.5];
	
	// 視点ベクトル
	//var eyeDirection = [0.0, 2.0, 3.0];
	
	// 環境光の色
	//var ambientColor = [0.3, 0.3, 0.3, 1.0];
	
	// (中略)
	
	// uniform変数の登録
	//gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
	//gl.uniformMatrix4fv(uniLocation[1], false, invMatrix);
	//gl.uniform3fv(uniLocation[3], lightDirection);
	//gl.uniform3fv(uniLocation[4], eyeDirection);
	//gl.uniform4fv(uniLocation[5], ambientColor);
    
    // 深度テストを有効にする
    //gl.enable(gl.DEPTH_TEST);
    //gl.depthFunc(gl.LEQUAL);
    
    // 有効にするテクスチャユニットを指定
    //gl.activeTexture(gl.TEXTURE0);
    
    // テクスチャ用変数の宣言
    //var texture = null;
    
    // テクスチャを生成
    //create_texture('texture.png');
	//create_texture('wataru_tex_y_blender.png');
	//create_texture('Cubes_tex.png');
	//create_texture('flog.png');
	//create_texture('Chrysanthemum.jpg');
    
    // カウンタの宣言
    var count = 0.0;
	
	//var flag = false;
	var tState = -1;//-1: no move, 0:rotation, 1:translate, 2:scale
	var startPoint = [0.0, 0.0];
	document.onmousemove = mouseMove;
	document.onmousedown = mouseDown;
	document.onmouseup = mouseUp;
	document.onmousewheel = mouseWheel;
	window.onresize = windowResize;
	//For FireFox
	if(window.addEventListener) {
		window.addEventListener('DOMMouseScroll', mouseWheelFF, false);
	}
    
    // 恒常ループ
    (function(){
    	//m.perspective(180.0 / Math.PI, c.width / c.height, 0.01, 5000, pMatrix);
	//m.ortho(-0.5 * c.width, 0.5 * c.width, 0.5 * c.height, -0.5 * c.height, 0.01, 5000, pMatrix);
	//m.multiply(pMatrix, vMatrix, tmpMatrix);
	
	 // canvasを初期化
	 gl.clearColor(1.0, 1.0, 1.0, 1.0);
	 //gl.clearDepth(1.0);
	 gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	 
	 // カウンタを元にラジアンを算出
	 count += 1.0 * speed.value;
	 if (count > 910.0) {
	 	count = 0.0;
	 }
	 //var amp = 1000.0;
	 var d1;
	 var d2;
	 var da1;
	 var da2;

	 if (count < lp[0][0]) {
	 	d1 = 0;
	 	d2 = 0;
	 	da1 = count / lp[0][0];
	 	da2 = 0.0;
	 	//console.log('start');
	 } else if (count > lp[0][nlc[0] - 1]) {
	 	d1 = 0;
	 	d2 = nlc[0] - 1;
	 	da1 = 0.0;
	 	da2 = (910.0 - count) / (910.0 - lp[0][nlc[0] - 1]);
	 	//console.log('goal');
	 } else {
	 	for (var i in lp[0]) {
	 		i = parseInt(i)
	 		if (count > lp[0][i] && count <= lp[0][i + 1]) {
	 			d1 = i;
	 			d2 = i + 1;
	 			//console.log(d1, d2);
	 			da1 = (lp[0][i + 1] - count) / (lp[0][i + 1] - lp[0][i]);
	 			da2 = (count - lp[0][i]) / (lp[0][i + 1] - lp[0][i]);
	 			break;
	 		}
	 	}
	 }
	 //console.log(count);
	 //console.log('count = ', count, 'd1 = ', d1, 'd2 = ', d2, 'da1 = ', da1, 'da2 = ', da2);
	 	
	 //count += 10;
	 //var rad = (count % 360) * Math.PI / 180;
	 
	 // テクスチャをバインドする
	 //gl.bindTexture(gl.TEXTURE_2D, texture);
	 //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	 //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	 //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	 //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST_MIPMAP_LINEAR);
	 //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
	 //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
	 
	 // uniform変数にテクスチャを登録
	 //gl.uniform1i(uniLocation[6], 0);
	 
	 // モデル座標変換行列の生成
	var mTempMatrix = m.identity(m.create());
	var mQtn = q.identity(q.create());
	q.rotate(rot.value * Math.PI / 180, [0.0, 0.0, 1.0], mQtn);
	q.toMatIV(mQtn, tMatrix);
	 //m.identity(mMatrix);
	 //q.toMatIV(mQtn, tMatrix);
	 
	 //m.multiply(tMatrix, mMatrix, mTempMatrix);
	 //m.scale(mTempMatrix, [0.5, 0.5, 0.5], mTempMatrix);
	 //m.scale(mTempMatrix, [10.0, 10.0, 10.0], mTempMatrix);
	 //m.rotate(mTempMatrix, rad, [0, 1, 0], mTempMatrix);
	 //m.multiply(tmpMatrix, mTempMatrix, mvpMatrix);
	 
	 //m.inverse(mTempMatrix, invMatrix);
	 
	 // uniform変数の登録と描画
	 //gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
	 //gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
	 //console.log(r.value);
	/*
	m.multiply(tMatrix, mMatrix, mTempMatrix);
	gl.uniform4fv(uniLocation[0], color);
	m.multiply(tmpMatrix, mTempMatrix, mvpMatrix);
	
	//m.inverse(mTempMatrix, invMatrix);
	
	// uniform変数の登録と描画
	gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);

	set_attribute(VBOList[0], attLocation, attStride);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iIndex[0]);

	gl.drawElements(gl.LINES, numLoop[0], gl.UNSIGNED_SHORT, 0);
	*/
	
	for (var i in models) {
		m.multiply(tMatrix, mMatrix, mTempMatrix);
		/*
		if (i > 1) {
			var tD = parseInt(trfcData[parseInt(r.value)][i - 2]);
			//console.log(colorBar(tD));
			m.scale(mTempMatrix, [1.0, 1.0, tD / 1000 + 1.0], mTempMatrix);
			gl.uniform4fv(uniLocation[0], colorBar(tD));
		} else {
			gl.uniform4fv(uniLocation[0], color[i]);
		}
		*/
		gl.uniform4fv(uniLocation[0], color[i]);
		m.multiply(tmpMatrix, mTempMatrix, mvpMatrix);
		
		gl.uniform1f(uniLocation[2], da1);
		gl.uniform1f(uniLocation[3], da2);
		gl.uniform1f(uniLocation[4], disp_amp.value);
		gl.uniform1f(uniLocation[5], force_range.value);
		//m.inverse(mTempMatrix, invMatrix);
		
		// uniform変数の登録と描画
		gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
		//gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
		
		var attOffset = [0.0, 4 * 3 * numLoop[i] * d1, 4 * 3 * numLoop[i] * d2, 4 * 3 * numLoop[i] * d1, 4 * 3 * numLoop[i] * d2];

		set_attribute(VBOList[i], attLocation, attStride, attOffset);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iIndex[i]);
		 //gl.uniform4fv(uniLocation[0], color[i]);

		gl.drawElements(gl.LINES, numLoop[i], gl.UNSIGNED_SHORT, 0);
	}
	

	 //gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
	 
	 // コンテキストの再描画
	 gl.flush();
	 
	 // ループのために再帰呼び出し
	 setTimeout(arguments.callee, 1000 / 30);
	 })();
    
    // シェーダを生成する関数
    function create_shader(id){
        // シェーダを格納する変数
	var shader;
        
        // HTMLからscriptタグへの参照を取得
        var scriptElement = document.getElementById(id);
        
        // scriptタグが存在しない場合は抜ける
        if(!scriptElement){return;}
        
        // scriptタグのtype属性をチェック
        switch(scriptElement.type){
				
				// 頂点シェーダの場合
            case 'x-shader/x-vertex':
                shader = gl.createShader(gl.VERTEX_SHADER);
                break;
                
				// フラグメントシェーダの場合
            case 'x-shader/x-fragment':
                shader = gl.createShader(gl.FRAGMENT_SHADER);
                break;
            default :
                return;
        }
        // 生成されたシェーダにソースを割り当てる
        gl.shaderSource(shader, scriptElement.text);
        
        // シェーダをコンパイルする
        gl.compileShader(shader);
        
        // シェーダが正しくコンパイルされたかチェック
        if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
            console.log('in create shader');
            // 成功していたらシェーダを返して終了
            return shader;
        }else{
            
            // 失敗していたらエラーログをアラートする
            alert(gl.getShaderInfoLog(shader));
        
        }
    }
    
    // プログラムオブジェクトを生成しシェーダをリンクする関数
    function create_program(vs, fs){
        // プログラムオブジェクトの生成
        var program = gl.createProgram();
        
        // プログラムオブジェクトにシェーダを割り当てる
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        
        // シェーダをリンク
        gl.linkProgram(program);
        
        // シェーダのリンクが正しく行なわれたかチェック
        if(gl.getProgramParameter(program, gl.LINK_STATUS)){
			
            // 成功していたらプログラムオブジェクトを有効にする
            gl.useProgram(program);
            
            // プログラムオブジェクトを返して終了
            return program;
        }else{
            
            // 失敗していたらエラーログをアラートする
            alert(gl.getProgramInfoLog(program));
        }
    }
    
    // VBOを生成する関数
    function create_vbo(data){
        // バッファオブジェクトの生成
        var vbo = gl.createBuffer();
        
        // バッファをバインドする
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        
        // バッファにデータをセット
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        
        // バッファのバインドを無効化
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        
        // 生成した VBO を返して終了
        return vbo;
    }
    
    // VBOをバインドし登録する関数
    function set_attribute(vbo, attL, attS, attOS){
        // 引数として受け取った配列を処理する
        for(var i in vbo){
            // バッファをバインドする
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
            //console.log('i = ', i);
            // attributeLocationを有効にする
            gl.enableVertexAttribArray(attL[i]);
            
            // attributeLocationを通知し登録する
            gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, attOS[i]);
        }
    }
    
    // IBOを生成する関数
    function create_ibo(data){
        // バッファオブジェクトの生成
        var ibo = gl.createBuffer();
        
        // バッファをバインドする
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        
        // バッファにデータをセット
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
        
        // バッファのバインドを無効化
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        
        // 生成したIBOを返して終了
        return ibo;
    }
    
    // テクスチャを生成する関数
    function create_texture(source){
        // イメージオブジェクトの生成
        var img = new Image();
        
        // データのオンロードをトリガーにする
        img.onload = function(){
            // テクスチャオブジェクトの生成
            var tex = gl.createTexture();
            
            // テクスチャをバインドする
            gl.bindTexture(gl.TEXTURE_2D, tex);
            
            // テクスチャへイメージを適用
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            
            // ミップマップを生成
            gl.generateMipmap(gl.TEXTURE_2D);
            
            // テクスチャのバインドを無効化
            gl.bindTexture(gl.TEXTURE_2D, null);
            
            // 生成したテクスチャをグローバル変数に代入
            texture = tex;
        };
        
        // イメージオブジェクトのソースを指定
        img.src = source;
    }
	
	function csv2Data(filePath) { //csvﾌｧｲﾙﾉ相対ﾊﾟｽor絶対ﾊﾟｽ
		var coord = new Array();
		//var norm = new Array();
		//var uv_coord = new Array();
		var data = new XMLHttpRequest();
		data.open("GET", filePath, false); //true:非同期,false:同期
		data.send(null);
		
		var LF = String.fromCharCode(10); //改行ｺｰﾄﾞ
		var lines = data.responseText.split(LF);
		var nL = parseInt(lines[0]);
		for	(var i = 0; i < nL; ++i) {
			var cells = lines[i + 1].split(",");
			for (var j = 0; j < 3; ++ j) {
				coord.push(cells[j]);
			}
		}

		var lp = new Array();
		var disp = new Array();
		var force = new Array();
		var nlc = parseInt(lines[nL + 1]);
		for (var lc = 0; lc < nlc; ++ lc) {
			lp.push(parseFloat(lines[nL + 2 + lc * (nL + 1)]));
			//console.log(parseFloat(lines[nL + 2 + lc * (nL + 1)]));
			//var tempDisp = new Array();
			for (var i = 0; i < nL; ++i) {
				var cells = lines[nL + 3 + lc * (nL + 1) + i].split(",");
				for (var j = 0; j < 3; ++j) {
					disp.push(cells[j]);
					force.push(cells[j + 3]);
					//console.log(cells[j + 3]);
					//tempDisp.push(cells[j]);
				}
			}
			//disp.push(tempDisp);
		}
		//console.log('data read');
		/*
		for (var i = 0; i < nL;++i) {
			var cells = lines[i + 9 + (nL + 1) * 1].split(",");
			for (var j = 0; j < 3; ++j) {
				norm.push(cells[j]);
			}
		}
		
		for (var i = 0; i < nL;++i) {
			var cells = lines[i + 9 + (nL + 1) * 2].split(",");
			for (var j = 0; j < 2; ++j) {
				uv_coord.push(cells[j]);
			}
		}
		*/
		//return [nL, coord, norm, uv_coord];
		return[nL, coord, nlc, lp, disp, force];
	}

	function csv2CamData(filePath) { //csvﾌｧｲﾙﾉ相対ﾊﾟｽor絶対ﾊﾟｽ
		var loc = new Array();
		var rot = new Array();
		var data = new XMLHttpRequest();
		data.open("GET", filePath, false); //true:非同期,false:同期
		data.send(null);
		
		var LF = String.fromCharCode(10); //改行ｺｰﾄﾞ
		var lines = data.responseText.split(LF);
		var locT = lines[1].split(",");
		for (var i = 0; i < 3; ++i) {
			loc.push(-1.0 * parseFloat(locT[i]));
		}
		var rotT = lines[3].split(",");
		for (var i = 0; i < 4; ++i) {
			rot.push(parseFloat(rotT[i]));
		}
		var fov = parseFloat(lines[5]);
		return [loc, rot, fov];
	}

	function csv2TrfcData(filePath) { //csvﾌｧｲﾙﾉ相対ﾊﾟｽor絶対ﾊﾟｽ
		var trfc = new Array();
		var data = new XMLHttpRequest();
		data.open("GET", filePath, false); //true:非同期,false:同期
		data.send(null);
		
		var LF = String.fromCharCode(10); //改行ｺｰﾄﾞ
		var lines = data.responseText.split(LF);
		for (var i = 5; i < 36; ++i) {
			var cells = lines[i].split(",");
			var t = new Array();
			for (var j = 79; j < 91; ++j) {
				t.push(cells[j]);
			}
			trfc.push(t);
		}
		return trfc;
	}

	function setupModel(model) {
		var obData = csv2Data(model);
		var numLoop = obData[0];
		var position = obData[1];
		var normal = obData[2];
		var textureCoord = obData[3];

		var vPosition = create_vbo(position);
		var vNormal = create_vbo(normal);
		var vTextureCoord = create_vbo(textureCoord);

		return [numLoop, [vPosition, vNormal, vTextureCoord]];
	}

	function colorBar(val) {
		var col;
		var min = colorRange[0];
		var max = colorRange[1];
		var ran = max - min;
		var ll = 0.1;

		if (val < min) {
			col = [ll, ll, 1.0, 1.0];
		} else if (val < min + ran * 0.25) {
			col = [ll, ((val - min) / (ran * 0.25)) * (1.0 - ll) + ll, 1.0, 1.0];
		} else if (val < min + ran * 0.5) {
			col = [ll, 1.0, 1.0 - (val - ran * 0.25 - min) / (ran * 0.25) * (1.0 - ll), 1.0];
		} else if (val < min + ran * 0.75) {
			col = [((val - ran * 0.5 - min) / (ran * 0.25)) * (1.0 - ll) + ll, 1.0, ll, 1.0];
		} else if (val < min + ran) {
			col = [1.0, 1.0 - (val - ran * 0.75 - min) / (ran * 0.25) * (1.0 - ll), ll, 1.0];
		} else {
			col = [1.0, ll, ll, 1.0];
		}
		return col;
	} 
	
	function mouseMove(e) {
		if(tState != -1) {
			/*
			if (e.clientX < c.offsetLeft || e.clientX > c.offsetLeft + c.width || e.clientY < c.offsetTop || e.clientY > c.offsetTop + c.height) {
				tState = -1;
			}*/
			var dX = (e.clientX - startPoint[0]);
			var dY = (e.clientY - startPoint[1]);
			if(tState == 0) {
				//var ax = [0.0, dY, -dX];
				//var dR = Math.sqrt(dX * dX + dY * dY) * 0.1;
				//var mQtn	  = q.identity(q.create());
				//q.rotate(dR  * Math.PI / 180, ax, mQtn);
				//q.rotate(-0.1 * dX * Math.PI / 180, [0.0, 0.0, 1.0], mQtn);
				//q.toMatIV(mQtn, tMatrix);
			} else if (tState == 1) {
				tScale = 0.0001;
				m.identity(tMatrix);
				//m.translate(tMatrix, [dX * tScale, -dY * tScale, 0.0], tMatrix);
				m.translate(tMatrix, [-dY * tScale, -dX * tScale, 0.0], tMatrix);
			}
		}
	}
	
	function mouseDown(e) {
		//flag = true;
		if (e.clientX > c.offsetLeft && e.clientX < c.offsetLeft + c.width && e.clientY > c.offsetTop && e.clientY < c.offsetTop + c.height) {
			tState = e.button;
		}
		startPoint = [e.clientX, e.clientY];
		console.log(e.button);
	}
	
	function mouseUp() {
		//flag = false;
		tState = -1;
		//q.identity(mQtn);
		//m.multiply(tMatrix, tMatrix0, tMatrix0);
		//m.multiply(tMatrix, mMatrix, mMatrix);
		//m.identity(tMatrix);
	}
	
	function mouseWheel(e) {
		sScale = 0.001;
		//m.identity(tMatrix);
		m.scale(mMatrix, [1.0 + e.wheelDeltaY * sScale, 1.0 + e.wheelDeltaY * sScale, 1.0 + e.wheelDeltaY * sScale], mMatrix);
	}

	function mouseWheelFF(e) {
		sScale = 0.01;
		var sm = m.identity(m.create());
		//m.scale(mMatrix, [1.0 - e.detail * sScale, 1.0 - e.detail * sScale, 1.0 - e.detail * sScale], mMatrix);
		m.scale(sm, [1.0 - e.detail * sScale, 1.0 - e.detail * sScale, 1.0 - e.detail * sScale], sm);
		m.multiply(sm, mMatrix, mMatrix);
	}
	
	function windowResize() {
		c.width = window.innerWidth;
		c.height = 0.4 * window.innerWidth;
		console.log('window resized');
	}

};