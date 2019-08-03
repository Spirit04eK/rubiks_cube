function Cube() {
    //Задаем сцену
    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(50
        , window.innerWidth / window.innerHeight , 0.1, 1000);
    let renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xEEEEEE);
    renderer.setSize(window.innerWidth, window.innerHeight);

    //Оси координат
    // let axes = new THREE.AxisHelper( 20 );
    // scene.add(axes);


    //Создаем 27 кубов
    //let colors = [Красный, Зеленый, Синий, Оранжевый, Желтый, Белый]
    let colors = [0xC7000B, 0x1CC700, 0x002AF5, 0xFF7600, 0xFFF042, 0xFFFFFF],
        faceMaterials = colors.map(function(c) {
            return new THREE.MeshLambertMaterial({ color: c , ambient: c, emissive : c });
        }),
        cubeMaterials = new THREE.MeshFaceMaterial(faceMaterials); // THREE.MeshFaceMaterial(obj)

    let cubeSize = 3,
        spacing = 0.1,
        dimensions = 3; //Размеры строк/столбцов

    let increment = cubeSize + spacing,
        //maxExtent = (cubeSize * dimensions + spacing * (dimensions - 1)) / 2,
        allCubes = [];

    function newCube(x, y, z) {
        let cubeGeometry = new THREE.CubeGeometry(cubeSize, cubeSize, cubeSize);
        let cube = new THREE.Mesh(cubeGeometry, cubeMaterials);
        cube.castShadow = true;

        cube.position = new THREE.Vector3(x, y, z);
        cube.rubikPosition = cube.position.clone();
        //console.log(cube.rubikPosition);

        scene.add(cube);
        allCubes.push(cube);
    }

    let positionOffset = (dimensions - 1) / 2;
    for(let i = 0; i < dimensions; i ++) {
        for(let j = 0; j < dimensions; j ++) {
            for(let k = 0; k < dimensions; k ++) {

                let x = (i - positionOffset) * increment,
                    y = (j - positionOffset) * increment,
                    z = (k - positionOffset) * increment;
                newCube(x, y, z);
            }
        }
    }

    //newCube(0, 0, 0);

    //Движение камеры при перемещении мышки
    let controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI / 2;

    function moveCamera() {
        requestAnimationFrame(moveCamera);
        controls.update();
        renderer.render(scene, camera);
    }
    moveCamera();

    //Настройки камеры
    camera.position = new THREE.Vector3(-20, 30, 30);
    camera.lookAt(scene.position);
    $("#WebGL-output").append(renderer.domElement);
    renderer.render(scene, camera);


    //Вращение плоскостей
    let clickVector;
    let moveEvents = $({});
    let moveQueue = [],
        completedMoveStack = [],
        currentMove;

    let isMoving = false,
        moveAxis, moveN, moveDirection,
        rotationSpeed = 0.2;

    let pivot = new THREE.Object3D(),
        activeGroup = [];

    function nearlyEqual(a, b, d) {
        d = d || 0.001;
        return Math.abs(a - b) <= d;
    }

    function setActiveGroup(axis, clickVector) {
        if(clickVector) {
            activeGroup = [];
            allCubes.forEach(function(cube) {
                if(nearlyEqual(cube.rubikPosition[axis], clickVector[axis])) {
                    activeGroup.push(cube);
                }
            });
        } else {
            console.log("Нечего двигать");
        }
    }

    let pushMove = function(cube, clickVector, axis, direction) {
        moveQueue.push({ cube: cube, vector: clickVector, axis: axis, direction: direction });
    };

    let startNextMove = function() {
        let nextMove = moveQueue.pop();

        if(nextMove) {
            let clickVector = nextMove.vector;

            let direction = nextMove.direction || 1,
                axis = nextMove.axis;

            if(clickVector) {

                if(!isMoving) {
                    isMoving = true;
                    moveAxis = axis;
                    moveDirection = direction;

                    setActiveGroup(axis, clickVector);

                    pivot.rotation.set(0,0,0);
                    pivot.updateMatrixWorld();
                    scene.add(pivot);

                    activeGroup.forEach(function(e) {
                        THREE.SceneUtils.attach(e, scene, pivot);
                    });

                    currentMove = nextMove;
                } else {
                    console.log("Готов двигаться");
                }
            } else {
                console.log("Нечего двигать!");
            }
        } else {
            moveEvents.trigger('Ну его...');
        }
    };

    function doMove() {
        if(pivot.rotation[moveAxis] >= Math.PI / 2) {
            pivot.rotation[moveAxis] = Math.PI / 2;
            moveComplete();
        } else if(pivot.rotation[moveAxis] <= Math.PI / -2) {
            pivot.rotation[moveAxis] = Math.PI / -2;
            moveComplete()
        } else {
            pivot.rotation[moveAxis] += (moveDirection * rotationSpeed);
        }
    }

    let moveComplete = function() {
        isMoving = false;
        moveAxis, moveN, moveDirection = undefined;
        clickVector = undefined;

        pivot.updateMatrixWorld();
        scene.remove(pivot);
        activeGroup.forEach(function(cube) {
            cube.updateMatrixWorld();

            cube.rubikPosition = cube.position.clone();
            cube.rubikPosition.applyMatrix4(pivot.matrixWorld);

            THREE.SceneUtils.detach(cube, pivot, scene);
        });
        completedMoveStack.push(currentMove);

        moveEvents.trigger('Успешно');

        startNextMove();
    };

    function render() {

        if(isMoving) {
            doMove();
        }

        renderer.render(scene, camera);
        requestAnimationFrame(render);
    }


    //Получение случайного числа
    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
    render();

    //Внешние функции
    return {
        //Проворачивание плоскостей
        rotate: function() {
            //0, 1, 2, 9, 10, 11, 18, 19, 20 - нижняя грань
            //использование рандомизации
            //Получение рандомный вектор
            function randomAxis() {
                return ['x', 'y', 'z'][randomInt(0,2)];
            }

            //Получить рандомный промежуток
            function randomDirection() {
                let x = randomInt(0,1);
                if (x === 0) x = -1;
                return x;
            }
            //Получить рандомный куб
            function randomCube() {
                let i = randomInt(0, allCubes.length - 1);
                return allCubes[i];
            }

            //Получаем много рандомных кубов
            let nMoves = randomInt(10, 40);
            for(let i = 0; i < nMoves; i ++) {
                let cube = randomCube();
                pushMove(cube, cube.position.clone(), randomAxis(), randomDirection());
            }

            startNextMove();
        }
    };
}

