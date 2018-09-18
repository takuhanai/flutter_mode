
window.onload = function(){
    // constant
	
    // variables
	let eText = document.getElementById('text');
	
	let phase = 0.0;
	let mode_type = 0;
	
	let ftn13_read = false;
	let ftn82_read = false;
	let ftn83_read = false;
	
	let coord = new Array();
	let index = new Array();
	let mode = new Array();
	let cmode_r = new Array();
	let cmode_i = new Array();
	
	let mousePressed = false;
	let prevMouseLocation;
	let currentMouseLocation;
	//let wheelDelta = 0.00005;
	let wheelDelta = 0.003;
	
	let touched = false;
	let prevTouchLocations;
	let currentTouchLocations;
	
	let allDataReady = false;
	
	let cameraVertAngle = 0.0;
	const cameraVertAngleMax = 0.0 * Math.PI / 180.0;
	const cameraVertAngleMin = -90.0 * Math.PI / 180.0;
	let cameraViewAngle = 40.0;
	const cameraViewAngleMax = 45.0;
	const cameraViewAngleMin = 20.0;
	
	let cameraOriginZSpeed;
	let cameraOriginZDest;

	console.log(navigator.userAgent);
	let browser;
	if (navigator.userAgent.indexOf('Chrome') != -1) {
		browser = 'Chrome';
	} else if (navigator.userAgent.indexOf('Firefox') != -1) {
		browser = 'Firefox';
		//wheelDelta = 0.005;
		wheelDelta = 0.3;
	} else if (navigator.userAgent.indexOf('Safari') != -1) {
		browser = 'Safari';
	}
	console.log(browser);
	
    // canvasエレメントを取得
    let c = document.getElementById('canvas');

	let camMode = 0;
    // webglコンテキストを取得
	let gl = c.getContext('webgl') || c.getContext('experimental-webgl');

    // 頂点シェーダとフラグメントシェーダの生成
    let v_shader = create_shader('vs');
    let f_shader = create_shader('fs');
    let prg = create_program(v_shader, f_shader);
    let attLocation = new Array();
    attLocation[0] = gl.getAttribLocation(prg, 'position');
	attLocation[1] = gl.getAttribLocation(prg, 'mode_amp');
    attLocation[2] = gl.getAttribLocation(prg, 'cmode_r');
	attLocation[3] = gl.getAttribLocation(prg, 'cmode_i');
	console.log(attLocation);
    let attStride = new Array();
    attStride[0] = 3;
    attStride[1] = 3;
	attStride[2] = 3;
	attStride[3] = 3;
    let uniLocation = new Array();
    uniLocation[0] = gl.getUniformLocation(prg, 'color');
    uniLocation[1] = gl.getUniformLocation(prg, 'mvpMatrix');
	uniLocation[2] = gl.getUniformLocation(prg, 'phase');
	uniLocation[3] = gl.getUniformLocation(prg, 'amp');
	uniLocation[4] = gl.getUniformLocation(prg, 'mode_type');//0: natural, 1: flutter

    gl.useProgram(prg);

	// 各種行列の生成と初期化
    let m = new matIV();
	let mMatrix = m.identity(m.create());
    let vMatrix = m.identity(m.create());
	let pMatrix = m.identity(m.create());
	let mvpMatrix = m.identity(m.create());
	let cvMatrix = m.identity(m.create()); //additional vMatrix
	//let tMatrix = m.identity(m.create());
	//let vTempMatrix = m.identity(m.create());
	
	m.rotate(vMatrix, -0.5 * Math.PI, [1.0, 0.0, 0.0], vMatrix)
	m.translate(vMatrix, [0.0, 1300.0, 0.0], vMatrix);
	//m.ortho(-0.5 * c.width, 0.5 * c.width, 0.5 * c.height, -0.5 * c.height, 0.01, 5000, pMatrix);
	//m.rotate(vMatrix, 0.5 * Math.PI, [1.0, 0.0, 0.0], vMatrix)
	//m.ortho(-850, 850, 850 * c.height / c.width, -850 * c.height / c.width, 0.01, 5000, pMatrix);
	m.perspective(cameraViewAngle, c.width / c.height, 0.01, 5000.0, pMatrix);
	
	m.translate(mMatrix, [-759.0, 0.0, 0.0], mMatrix);
	//m.multiply(pMatrix, vMatrix, mvpMatrix);
	//m.multiply(mvpMatrix, mMatrix, mvpMatrix);

	let q = new qtnIV();
	
	let num_loop;
	let VBOList;
	let iIndex;
	
	let num_vert;
	let num_mode;
	let freqs = [];
	let mode_id = 11;
	
	let wire_color = [[0.3, 1.0, 0.3, 1.0], [1.0, 0.3, 0.3, 1.0]];
	
	readFlutterData();
	//console.log(coord);
	
	window.addEventListener('keyup', keyUp, false);
	
	let supportTouch = 'ontouchend' in document;
	if (supportTouch) {
		c.addEventListener('touchstart', touchStart, false);
		c.addEventListener('touchmove', touchMove, false);
		c.addEventListener('touchend', touchEnd, false);
	} else {
		c.addEventListener('mousedown', mouseDown, false);
		c.addEventListener('mousemove', mouseMove, false);
		c.addEventListener('mouseup', mouseUp, false);
		c.addEventListener('wheel', wheel, false);
	}
	
	render();
	
    function render(){
		//console.log(ftn13_read, ftn82_read, ftn83_read);
		if (ftn13_read && ftn82_read && ftn83_read && !allDataReady) {
			console.log(coord.length, mode.length, cmode_r.length, cmode_i.length);
			allDataReady = true;
			VBOList = [create_vbo(coord), create_vbo(mode), create_vbo(cmode_r), create_vbo(cmode_i)];
			
			iIndex = create_ibo(index);
		}
		//phase += freqs[mode_id] / 60.0 * 2.0 * Math.PI;
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		// アニメーション
        requestAnimationFrame(render);

        if (allDataReady === true) {
			// 全てのリソースのロードが完了している
			phase += freqs[mode_id] / 60.0 * 2.0 * Math.PI;
			
			//drawUpdate();
			
			if (supportTouch) {
				touchUpdate();
			} else {
				mouseUpdate();
			}
			
            gl.enable(gl.DEPTH_TEST);
			//gl.enable(gl.CULL_FACE);
			//gl.enable(gl.BLEND);
			//gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			
			//cameraUpdate();
			
			// canvasを初期化
            //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            //gl.viewport(0, 0, c.width, c.height);
            //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            // objects の描画
            objectRender();
			
        }else{
            // canvasを初期化
            //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // リソースのロードが完了していない
            // プログレス表示
            //m.multiply(p1Matrix, vMatrix, vpMatrix);
            //progressRender();
        }

        gl.flush();
    }
	
	function mouseUpdate() {
		if (mousePressed) {
			let deltaX = currentMouseLocation.x - prevMouseLocation.x;
			let deltaY = currentMouseLocation.y - prevMouseLocation.y;
			cameraInteractionUpdate(deltaX, deltaY);
			
			prevMouseLocation = currentMouseLocation;
		}
	}
	
	function touchUpdate() {
		if (touched) {
			if (currentTouchLocations.length === 1) {//rotation
				let deltaX = currentTouchLocations[0].x - prevTouchLocations[0].x;
				let deltaY = currentTouchLocations[0].y - prevTouchLocations[0].y;
				cameraInteractionUpdate(deltaX, deltaY);
				prevTouchLocations = currentTouchLocations;
			} else if (currentTouchLocations.length === 2) {//zoom up
				let ct0 = currentTouchLocations[0];
				let ct1 = currentTouchLocations[1];
				let currentDist = Math.sqrt((ct1.x - ct0.x) * (ct1.x - ct0.x) + (ct1.y - ct0.y) * (ct1.y - ct0.y));
				let pt0 = prevTouchLocations[0];
				let pt1 = prevTouchLocations[1];
				let prevDist = Math.sqrt((pt1.x - pt0.x) * (pt1.x - pt0.x) + (pt1.y - pt0.y) * (pt1.y - pt0.y));
				
				let ay = cameraViewAngle;
				ay -= 0.001 * (currentDist - prevDist);
				if (ay < cameraViewAngleMax && ay > cameraViewAngleMin) {
					cameraViewAngle = ay;
				}
				prevTouchLocations = currentTouchLocations;
			}
		}
	}
	
	function cameraInteractionUpdate(dX, dY) {
		m.rotate(cvMatrix, 0.005 * dX, [0, 0, 1], cvMatrix);
		
		let deltaRotY = -0.005 * dY;
		if (cameraVertAngle + deltaRotY < cameraVertAngleMax && cameraVertAngle + deltaRotY > cameraVertAngleMin) {
			//let rMatrix = m.identity(m.create());
			m.rotate(vMatrix, -deltaRotY, [1, 0, 0], vMatrix);
			//m.multiply(rMatrix, vMatrix, vMatrix);
			//m.rotate(vMatrix, -deltaRotY, [1, 0, 0], vMatrix);
			cameraVertAngle += deltaRotY;
		}
	}
	
	function drawUpdate() {
		switch (drawMode) {
			case 0:
				objects['window'].draw = true;
				objects['roof_01'].draw = true;
				objects['outer_02'].draw = true;
				objects['outer_03'].draw = true;
				objects['inner_2nd'].draw = true;
				objects['inner_3rd'].draw = true;
				//objects['camera_origin'].mMatrix0[14] = 4.5;
				cameraOriginZDest = 4.5;
				cameraOriginZSpeed = (4.5 - objects['camera_origin'].mMatrix0[14]) / (0.3 * FPS);
				break;
			case 1:
				objects['window'].draw = false;
				break;
			case 2:
				objects['roof_01'].draw = false;
				//objects['camera_origin'].mMatrix0[14] = 7.9;
				cameraOriginZDest = 7.9;
				cameraOriginZSpeed = (7.9 - objects['camera_origin'].mMatrix0[14]) / (0.3 * FPS);
				break;
			case 3:
				objects['outer_03'].draw = false;
				objects['inner_3rd'].draw = false;
				//objects['camera_origin'].mMatrix0[14] = 4.4;
				cameraOriginZDest = 4.4;
				cameraOriginZSpeed = (4.4 - objects['camera_origin'].mMatrix0[14]) / (0.3 * FPS);
				break;
			case 4:
				objects['outer_02'].draw = false;
				objects['inner_2nd'].draw = false;
				//objects['camera_origin'].mMatrix0[14] = 2.1;
				cameraOriginZDest = 2.1;
				cameraOriginZSpeed = (2.1 - objects['camera_origin'].mMatrix0[14]) / (0.3 * FPS);
				break;
			default:
				return;
		}
		
	}

    // camera update
    function cameraUpdate(){
		let _obCamera = objects[obCamera[camMode]];
		switch (_obCamera.camera_type) {// 0: PERSP, 1: ORTHO
			case 0: //PERSP
				m.perspective(_obCamera.angle_y / 1.0 * 180.0 / Math.PI, c.width / c.height, _obCamera.clip_start, _obCamera.clip_end, _obCamera.pMatrix);
				break;
		}
		m.inverse(_obCamera.mMatrix, vMatrix);
        m.multiply(_obCamera.pMatrix, vMatrix, vpMatrix);
    }

    function objectRender(){
		m.perspective(cameraViewAngle, c.width / c.height, 0.01, 5000.0, pMatrix);
		m.multiply(pMatrix, vMatrix, mvpMatrix);
		m.multiply(mvpMatrix, cvMatrix, mvpMatrix);
		m.multiply(mvpMatrix, mMatrix, mvpMatrix);
		
		let attOffset = [0.0, 4 * 3 * num_vert * mode_id, 4 * 3 * num_vert * mode_id, 4 * 3 * num_vert * mode_id];
		set_attribute(VBOList, attLocation, attStride, attOffset);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iIndex);
		gl.uniform4fv(uniLocation[0], wire_color[mode_type]); //color
		gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix); //MVPMatrix
		gl.uniform1f(uniLocation[2], phase); //phase
		gl.uniform1f(uniLocation[3], 5000.0); //amp
		gl.uniform1i(uniLocation[4], mode_type); //mode type, 0: natural, 1: flutter
		gl.drawElements(gl.LINES, num_loop, gl.UNSIGNED_SHORT, 0);
    }

    // プログレス表示
    function progressRender(){
        gl.uniform2fv(uniLocation[5], [0.0, 0.0]);
        for (var i = 0 in obLoading) {
            //eText.textContent = numDataReady + ': ' + obNames.length;
            //if (objects[obLoading[i]].dataReady && objects[obLoading[i]].texture[objects[obLoading[i]].name] && !allDataReady) {
            if (objects[obLoading[i]].dataReady && objects[obLoading[i]].texture[obLoading[i]]) {
                set_attribute(objects[obLoading[i]].VBOList, attLocation, attStride);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, objects[obLoading[i]].iIndex);

                gl.bindTexture(gl.TEXTURE_2D, objects[obLoading[i]].texture[obLoading[i]]);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);

                // uniform変数にテクスチャを登録
                //gl.uniform1f(uniLocation[7], 1.0);

                var mTempMatrix = m.identity(m.create());
                if (obLoading[i] == 'progress_bar') {
                    m.scale(mTempMatrix, [numDataReady / (obNames.length * 2), 1, 1], mTempMatrix);
                }
                m.multiply(objects[obLoading[i]].mMatrix, mTempMatrix, mTempMatrix);

                m.multiply(vpoMatrix, mTempMatrix, mvpMatrix);
                gl.uniformMatrix4fv(uniLocation[1], false, mvpMatrix);
                gl.uniformMatrix4fv(uniLocation[2], false, invMatrix);
                gl.uniform1f(uniLocation[4], 1.0);

                gl.drawElements(gl.TRIANGLES, objects[obLoading[i]].numLoop, gl.UNSIGNED_SHORT, 0);
            }
        }
    }

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
			//console.log(i);
            // バッファをバインドする
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
            
            // attributeLocationを有効にする
			//console.log(i);
            gl.enableVertexAttribArray(attL[i]);
			//console.log(i, attL[i]);
            
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

	function create_texture(source, i_source){
		var img = new Image();
		img.onload = function(){
			var tex = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.bindTexture(gl.TEXTURE_2D, null);
			objects[source].texture[i_source] = tex;
			numDataReady += 1;
			allDataReady = checkAllDataReady();
		};
		img.src = './resource/textures/' + i_source + '.png';
		console.log(i_source);
	}
	
	function readFlutterData() {
		
		let Vert = function () {
			this.id;
		}
		let verts = new Array(); // coordinate of each vertex
		
		let ftn13 = new XMLHttpRequest();
		ftn13.open("GET", './resource/ftn13', true); //true:非同期,false:同期
		ftn13.responseType = 'arraybuffer';
		ftn13.send(null);
		
		ftn13.onload = function(e) {
			let arrayBuffer = ftn13.response;
			let dv13 = new DataView(arrayBuffer);
			let off = 0;
			num_vert = dv13.getInt32(off + 8, true);
			console.log(num_vert);
			off += 60;
			for (let i = 0; i < num_vert; i++) {
				let v = new Vert();
				v.id = i;
				coord.push(dv13.getFloat64(off + 4, true));
				coord.push(dv13.getFloat64(off + 12, true));
				coord.push(dv13.getFloat64(off + 20, true));
				verts[dv13.getInt32(off, true)] = v;
				off += 88;
			}
			let num_memb = dv13.getInt32(off + 4, true);
			console.log(num_memb);
			off += 16
			num_loop = 0;
			for (let i = 0; i < num_memb; i++) {
				let elm = dv13.getInt32(off, true);
				if (elm < 1600 || elm > 1999) { // remove suspender ropes (kitabisan)
					index.push(verts[dv13.getInt32(off + 8, true)].id);
					index.push(verts[dv13.getInt32(off + 12, true)].id);
					num_loop += 2;
				}
				off += 28;
			}
			
			num_mode = dv13.getInt32(off + 8, true);
			off += 60;
			
			for (let i = 0; i < num_mode; i++) {
				freqs.push(dv13.getFloat64(off + 4, true));
				off += 84;
				for (let ii = 0; ii < num_vert; ii++) {
					mode.push(dv13.getFloat64(off + 4, true));
					mode.push(dv13.getFloat64(off + 12, true));
					mode.push(dv13.getFloat64(off + 20, true));
					off += 60;
				}
			}
			ftn13_read = true;
			//VBOList.push(create_vbo(coord), create_vbo(mode));
			//iIndex = create_ibo(index);
		}
		
		let ftn82 = new XMLHttpRequest();
		ftn82.open("GET", './resource/ftn82', true);
		ftn82.responseType = 'arraybuffer';
		ftn82.send(null);
		
		ftn82.onload = function(e) {
			let arrayBuffer = ftn82.response;
			let dv82 = new DataView(arrayBuffer);
			
			//let off = 60 + 84 * num_vert + 16 + 28 * num_memb + 60;
			let off = 0;
			let n_v = dv82.getInt32(off + 8, true);
			off += 60 + 84 * n_v;
			let n_m = dv82.getInt32(off + 4, true);
			off += 16 + 28 * n_m;
			let n_mo = dv82.getInt32(off + 8, true);
			off += 60;
			
			for (let i = 0; i < n_mo; i++) {
				off += 76;
				for (let ii = 0; ii < n_v; ii++) {
					cmode_r.push(dv82.getFloat64(off + 4, true));
					cmode_r.push(dv82.getFloat64(off + 12, true));
					cmode_r.push(dv82.getFloat64(off + 20, true));
					off += 60;
				}
			}
			ftn82_read = true;
			//VBOList.push(create_vbo(cmode_r));
		}
		
		let ftn83 = new XMLHttpRequest();
		ftn83.open("GET", './resource/ftn83', true);
		ftn83.responseType = 'arraybuffer';
		ftn83.send(null);
		
		ftn83.onload = function(e) {
			let arrayBuffer = ftn83.response;
			let dv83 = new DataView(arrayBuffer);
			
			//let off = 60 + 84 * num_vert + 16 + 28 * num_memb + 60;
			let off = 0;
			let n_v = dv83.getInt32(off + 8, true);
			off += 60 + 84 * n_v;
			let n_m = dv83.getInt32(off + 4, true);
			off += 16 + 28 * n_m;
			let n_mo = dv83.getInt32(off + 8, true);
			off += 60;
			
			for (let i = 0; i < n_mo; i++) {
				off += 76;
				for (let ii = 0; ii < n_v; ii++) {
					cmode_i.push(dv83.getFloat64(off + 4, true));
					cmode_i.push(dv83.getFloat64(off + 12, true));
					cmode_i.push(dv83.getFloat64(off + 20, true));
					off += 60;
				}
			}
			ftn83_read = true;
			//VBOList.push(create_vbo(cmode_i));
		}
		//console.log(mode.length, cmode_r.length, cmode_i.length);
		
		//VBOList = [create_vbo(coord), create_vbo(mode), create_vbo(cmode_r), create_vbo(cmode_i)];
		
		//iIndex = create_ibo(index);
	}

	function readObjectData_old(filePath) { //csvﾌｧｲﾙﾉ相対ﾊﾟｽor絶対ﾊﾟｽ
		var coord = new Array();
		var norm = new Array();
		var uv_coord = new Array();
		var data = new XMLHttpRequest();
		data.open("GET", './resource/objects/' + filePath + '.dat', true); //true:非同期,false:同期
		data.responseType = 'arraybuffer';
		data.send(null);
		
		data.onload = function(e) {
			var arrayBuffer = data.response;
			var dv = new DataView(arrayBuffer);
			var location = [];
			var rotation = [];
			var scale = [];
			var off = 0;
			var ob = objects[filePath];
			
			ob.type = dv.getInt32(off, true); //0:MESH, 8:CAMERA
			off += 4;
			ob.rotation_mode = dv.getInt32(off, true);
			//console.log(filePath, ob.rotation_mode);
			off += 4;
			
			for (var i = 0; i < 3; i++) {
				location.push(dv.getFloat32(off, true));
				off += 4;
			}
			ob.location = location;
			
			var rotation_comp = 4;
			if (ob.rotation_mode != 0) {
				rotation_comp = 3;
			}
			for (var i = 0; i < rotation_comp; i++) {
				rotation.push(dv.getFloat32(off, true));
				off += 4;
			}
			ob.rotation = rotation;
			
			for (var i = 0; i < 3; i++) {
				scale.push(dv.getFloat32(off, true));
				off += 4;
			}
			ob.scale = scale;
			ob.mMatrix0 = transformationMatrix(ob.location, ob.rotation, ob.scale, ob.rotation_mode);//Local coordinate
			ob.mMatrix = transformationMatrix(ob.location, ob.rotation, ob.scale, ob.rotation_mode);//Global coordinate
			
			if (ob.type == 0) {//object type 'MESH'
				ob.numLoop = dv.getInt32(off, true);
				off += 4;
				
				for	(var i = 0; i < ob.numLoop; ++i) {
					for (var j = 0; j < 3; ++ j) {
						coord.push(dv.getFloat32(off, true));
						off += 4;
					}
				}
				
				for	(var i = 0; i < ob.numLoop; ++i) {
					for (var j = 0; j < 2; ++ j) {
						uv_coord.push(dv.getFloat32(off, true));
						off += 4;
					}
				}
				
				var ind = new Array();
				for (var ii = 0; ii < ob.numLoop;++ii) {
					ind.push(ii);
				}
				
				var vPosition     = create_vbo(coord);
				var vTextureCoord = create_vbo(uv_coord);
				ob.VBOList       = [vPosition, vTextureCoord];
				ob.iIndex        = create_ibo(ind);
				
				create_texture(filePath, filePath);
			} else if (ob.type == 8) {//object type 'CAMERA'
				console.log(filePath);
				var _pMatrix = m.identity(m.create());
				ob.camera_type = dv.getInt32(off, true);
				off += 4;
				ob.clip_start = dv.getFloat32(off, true);
				off += 4;
				ob.clip_end = dv.getFloat32(off, true);
				off += 4;
				switch (ob.camera_type) {// 0: PERSP, 1: ORTHO
					case 0: //PERSP
						ob.angle_y = dv.getFloat32(off, true);
						m.perspective(ob.angle_y / 1.0 * 180.0 / Math.PI, c.width / c.height, ob.clip_start, ob.clip_end, _pMatrix);
						break;
					case 1: //ORTHO
						ob.ortho_scale = dv.getFloat32(off, true);
						m.ortho(-ob.ortho_scale * c.width, ob.ortho_scale * c.width, ob.ortho_scale * c.height, -ob.ortho_scale * c.height, ob.clip_start, ob.clip_end, _pMatrix);
						break;
				}
				ob.pMatrix = _pMatrix;
				
				//console.log(objects[filePath]);
			}
			
			objects[filePath].dataReady = true;
			numDataReady += 1;
			allDataReady = checkAllDataReady();
			
		}
	}
	
	function checkAllDataReady() {
		var ready = true;
		for (var i = 0 in objects) {
			if (!objects[i].dataReady) {
				ready = false;
			}
			if (objects[i].type == 0 && !objects[i].texture[i]) {
				ready = false;
			}
		}
		return ready;
	}

	function readActionData(acName) {
		var Co = function (_co) {
			this.x = parseFloat(_co[0]);
			this.y = parseFloat(_co[1]);
		}
		var Point = function () {
			
		}
		var Bezier = function () {
			
		}
		var Action = function () {}
		
		var data = new XMLHttpRequest();
		data.open("GET", './resource/actions/' + acName + '.csv', false); //true:非同期,false:同期
		data.send(null);
		
		var LF = String.fromCharCode(10); //改行ｺｰﾄﾞ
		var lines = data.responseText.split(LF);
		var cl = 0
		
		let aT = lines[cl++]; //action type
		
		let frRange = lines[cl++].split(',');
		let nB = parseInt(lines[cl++]);
		let beziers = [];
		for (var i = 0; i < nB; ++i) {
			var bz = new Bezier();
			bz.data_path = lines[cl];
			bz.array_index = parseInt(lines[cl + 1]);
			bz.keyframe_points = parseInt(lines[cl + 2]);
			cl += 3;
			bz.handles = [];
			for (var j = 0; j < bz.keyframe_points; ++j) {
				var point = new Point();
				point.handle_left = new Co(lines[cl].split(','));
				point.co = new Co(lines[cl + 1].split(','));
				point.handle_right = new Co(lines[cl + 2].split(','));
				bz.handles.push(point);
				cl += 3;
			}
			beziers.push(bz);
		}
		
		var action = new Action();
		
		action.frame_start = parseFloat(frRange[0]);
		action.frame_end = parseFloat(frRange[1]);
		action.numCurve = nB;
		action.curves = beziers;
	
		if (aT === 'object action') {
			action.type = 0;
		} else if (aT === 'material action') {
			action.type = 1;
		}
	
		action.play = 1; //0: stop, 1: play loop, 2: play once (return to first frame), 3: play once (stay at last frame)
		action.forward = true;
		
		return action;
	}

	function readParentList() {
		var data = new XMLHttpRequest();
		data.open("GET", './resource/parent_list.csv', false); //true:非同期,false:同期
		data.send(null);
		
		var LF = String.fromCharCode(10); //改行ｺｰﾄﾞ
		var lines = data.responseText.split(LF);
		var pList = new Array();
		for (var i = 0 in lines) {
			var a = lines[i].split(',');
			pList[a[0]] = a[1];
		}
		
		return pList;
	}
	
	function evaluateAction(_action, _x, _loc, _rot, _scale, _rotation_mode) {
		let locVec = _loc.slice();
		let rotVec = _rot.slice();
		let scVec = _scale.slice();
		
		for (var i = 0; i < _action.numCurve; i++) {
			if (_action.curves[i].data_path == 'location') {
				locVec[_action.curves[i].array_index] = bezier2D(_action.curves[i].handles, _x);
			} else if (_action.curves[i].data_path == 'scale') {
				scVec[_action.curves[i].array_index] = bezier2D(_action.curves[i].handles, _x);
			} else if (_action.curves[i].data_path == 'rotation_euler') {
				rotVec[_action.curves[i].array_index] = bezier2D(_action.curves[i].handles, _x);
			} else if (_action.curves[i].data_path == 'rotation_quaternion') {
				rotVec[_action.curves[i].array_index] = bezier2D(_action.curves[i].handles, _x);
			}
		}
		
		return transformationMatrix(locVec, rotVec, scVec, _rotation_mode);
	}
	
	function evaluateMaterialAction(_action, _x) {
		let material = function () {
			
		}
		for (var i = 0; i < _action.numCurve; i++) {
			if (_action.curves[i].data_path === 'alpha') {
				material.alpha = bezier2D(_action.curves[i].handles, _x);
			}
		}
		return material;
	}
	
	function transformationMatrix(_loc, _rot, _scale, _rot_mode) {
		var mMatrix = m.identity(m.create());
		
		var mQtn = q.identity(q.create());
		var rMatrix = m.identity(m.create());
		var tMatrix = m.identity(m.create());
		var sMatrix = m.identity(m.create());
		
		switch (_rot_mode) {
			case 0:
				mQtn[0] = _rot[1];
				mQtn[1] = _rot[2];
				mQtn[2] = _rot[3];
				mQtn[3] = _rot[0];
				q.inverse(mQtn, mQtn);
				q.toMatIV(mQtn, rMatrix);
				break;
			case 1://XYZ
				//m.rotate(rMatrix, _rot[0], [1, 0, 0], rMatrix);
				//m.rotate(rMatrix, _rot[1], [0, 1, 0], rMatrix);
				m.rotate(rMatrix, _rot[2], [0, 0, 1], rMatrix);
				m.rotate(rMatrix, _rot[1], [0, 1, 0], rMatrix);
				m.rotate(rMatrix, _rot[0], [1, 0, 0], rMatrix);
				break;
			case 2://XZY
				m.rotate(rMatrix, _rot[0], [1, 0, 0], rMatrix);
				m.rotate(rMatrix, _rot[2], [0, 0, 1], rMatrix);
				m.rotate(rMatrix, _rot[1], [0, 1, 0], rMatrix);
				break;
			case 3://YXZ
				m.rotate(rMatrix, _rot[1], [0, 1, 0], rMatrix);
				m.rotate(rMatrix, _rot[0], [1, 0, 0], rMatrix);
				m.rotate(rMatrix, _rot[2], [0, 0, 1], rMatrix);
				break;
			case 4://YZX
				m.rotate(rMatrix, _rot[1], [0, 1, 0], rMatrix);
				m.rotate(rMatrix, _rot[2], [0, 0, 1], rMatrix);
				m.rotate(rMatrix, _rot[0], [1, 0, 0], rMatrix);
				break;
			case 5://ZXY
				m.rotate(rMatrix, _rot[2], [0, 0, 1], rMatrix);
				m.rotate(rMatrix, _rot[0], [1, 0, 0], rMatrix);
				m.rotate(rMatrix, _rot[1], [0, 1, 0], rMatrix);
				break;
			case 6://ZYX
				m.rotate(rMatrix, _rot[2], [0, 0, 1], rMatrix);
				m.rotate(rMatrix, _rot[1], [0, 1, 0], rMatrix);
				m.rotate(rMatrix, _rot[0], [1, 0, 0], rMatrix);
				break;
		}
		
		m.translate(tMatrix, _loc, tMatrix);
		m.scale(sMatrix, _scale, sMatrix);
		
		m.multiply(tMatrix, sMatrix, mMatrix);
		m.multiply(mMatrix, rMatrix, mMatrix);
		return mMatrix;
	}

	function bezier2D(_handles, _x) {
		if ((_handles[0].co.x > _x) || (_handles[_handles.length - 1].co.x < _x)) {
			return null;
		} else {
			for (var ir = 0 in _handles) {
				if (_handles[ir].co.x > _x) {
					break;
				}
			}
			ir -= 1;
			var cp = [_handles[ir].co, _handles[ir].handle_right, _handles[ir + 1].handle_left, _handles[ir + 1].co];
			var t = (_x - cp[0].x) / (cp[3].x - cp[0].x);
			var delta = (t > 0.5) ? (1.0 - t) * 0.5 : t * 0.5;
			var pdif;
			var dif = 0.5;
			var n = 0;
			var ae = 0.0001;
			while (Math.abs(dif) > ae) {
				pdif = dif;
				dif = _x - (
							 cp[0].x * (1.0 - t) * (1.0 - t) * (1.0 - t)
							 + 3.0 * cp[1].x * t * (1.0 - t) * (1.0 - t)
							 + 3.0 * cp[2].x * t * t * (1.0 - t)
							 + cp[3].x * t * t * t
							 );
				if (dif * pdif < 0) {
					delta *= 0.5;
				}
				if (dif > ae) {
					t += delta;
				} else if (dif < -ae) {
					t -= delta;
				}
				n += 1;
			}
			var y = cp[0].y * (1.0 - t) * (1.0 - t) * (1.0 - t)
			+ 3.0 * cp[1].y * t * (1.0 - t) * (1.0 - t)
			+ 3.0 * cp[2].y * t * t * (1.0 - t)
			+ cp[3].y * t * t * t;
			
			return y;
		}
		
	}
	
	function HUDUpdate(){
	}
	
	function mouseDown(e) {
		mousePressed = true;
		prevMouseLocation = getMouseLocation(e);
		currentMouseLocation = prevMouseLocation;
		if (prevMouseLocation.x > c.width * 0.9 && prevMouseLocation.y > c.height * 0.9) {
			if (mode_type === 0) {
				mode_type = 1;
			} else {
				mode_type = 0;
			}
		}
	}
	
	function mouseMove(e) {
		currentMouseLocation = getMouseLocation(e);
	}
	
	function mouseUp(e) {
		mousePressed = false;
	}
	
	function wheel(e) {
		//wheelDelta = e.deltaY;
		let ay = cameraViewAngle;
		ay += wheelDelta * e.deltaY;
		if (ay < cameraViewAngleMax && ay > cameraViewAngleMin) {
			cameraViewAngle = ay;
		}
		//eText.textContent = ay;
	}
	
	function touchStart(e) {
		touched = true;
		prevTouchLocations = getTouchLocations(e);
		currentTouchLocations = prevTouchLocations;
		if (prevTouchLocations.length === 1) {
			if (prevTouchLocations[0].x > c.width * 0.9 && prevTouchLocations[0].y > c.height * 0.9) {
				if (mode_type === 0) {
					mode_type = 1;
				} else {
					mode_type = 0;
				}
			}
		}
		e.preventDefault();
	}
	
	function touchMove(e) {
		currentTouchLocations = getTouchLocations(e);
		eText.textContent = currentTouchLocations.length;
		e.preventDefault();
		
	}
	
	function touchEnd(e) {
		touched = false;
		e.preventDefault();
	}
	
	function keyUp(e) {
		console.log(e.keyCode);
		if (e.keyCode === 78) {//n key
			mode_type = 0;
		}
		if (e.keyCode === 70) {//f key
			mode_type = 1;
		}
		if (e.keyCode === 38) {//UP key
			mode_id += 1;
			if (mode_id > num_mode - 1) {
				mode_id = 0;
			}
			e.preventDefault();
			eText.textContent = mode_id;
		}
		if (e.keyCode === 40) {//DOWN key
			mode_id -= 1;
			if (mode_id < 0) {
				mode_id = num_mode -1;
			}
			e.preventDefault();
			eText.textContent = mode_id;
		}
	}
	
	function getMouseLocation(e) {
		const mouseLocation = {};
		
		let rect = e.target.getBoundingClientRect();
		
		mouseLocation.x = e.clientX - rect.left;
		mouseLocation.y = e.clientY - rect.top;
		return mouseLocation;
	}
	
	function getTouchLocations(e) {
		const touchLocations = [];
		
		let rect = e.target.getBoundingClientRect();
		for (var i = 0; i < e.touches.length; i++) {
			const touchLocation = {};
			touchLocation.x = e.touches[i].clientX - rect.left;
			touchLocation.y = e.touches[i].clientY - rect.top;
			touchLocations.push(touchLocation);
		}
		return touchLocations;
	}
	
	function toggleCameraAction() {
		if (objects['camera_origin'].objectAction.play === 0) {
			objects['camera_origin'].objectAction.play = 1;
		} else {
			objects['camera_origin'].objectAction.play = 0;
		}
	}

};
