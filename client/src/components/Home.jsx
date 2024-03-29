import React, { useEffect, useState } from "react";
import AceEditor from "react-ace";
import axios from "axios";
import socket from "../socket";
import { VscRunAll } from "react-icons/vsc";
import { FaUpload, FaDownload } from 'react-icons/fa';
import { RiImageAddLine } from 'react-icons/ri';
import { languages, highlightedLangs, themes } from "./Snippets";
import { useParams, useNavigate } from "react-router-dom";
import { Link } from 'react-router-dom';
import Tesseract from "tesseract.js";

highlightedLangs.forEach((lang) => {
  require(`ace-builds/src-noconflict/mode-${lang}`);
  require(`ace-builds/src-noconflict/snippets/${lang}`);
});
themes.forEach((theme) => require(`ace-builds/src-noconflict/theme-${theme}`));

const Home = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [code, setCode] = useState(languages[0].sampleCode);
  const [result, setResult] = useState("");
  const [inputData, setInputData] = useState("");
  const [fs, setFs] = useState("18");
  const [th, setTh] = useState("monokai");
  const [lang, setLang] = useState("python");
  const [ext, setExt] = useState("py");
  const [isDis, setIsDis] = useState(false);
  const [recLi, setRecLi] = useState([]);
  const [username, setUsername] = useState("");
  const [image, setImage] = useState(null);

  useEffect(() => {
    if (roomId) {
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
      };
      axios
        .get(`/api/getcode/${roomId}`, config)
        .then(({ data, status }) => {
          if (status === 200) {
            setCode(data.code);
            setExt(data.extension);
            setLang(data.lang);
            setUsername(data.username);
            let ind;
            for (let i = 0; i < languages.length; i++) {
              if (languages[i].extension === data.extension) {
                ind = i;
                break;
              }
            }
            let tempArr = languages.filter(
              (l) => l.extension !== data.extension
            );
            tempArr.unshift(languages[ind]);
            setRecLi(tempArr);
            console.log(tempArr);
          } else {
            alert("Invalid URL!");
            navigate("/");
          }
        })
        .catch((err) => {
          console.log(err);
          alert("Invalid URL!");
          navigate("/");
          setRecLi(languages);
        });
    } else setRecLi(languages);
  }, []);

  useEffect(() => {
    socket.emit("joined", { roomDbId: roomId });
  }, [socket]);

  useEffect(() => {
    const setCodeFunc = ({ recCode }) => {
      setCode(recCode);
      console.log(recCode);
    }
    const receivingInpFunc = ({ inp }) => {
      setInputData(inp);
    }
    const receiveOpFunc = ({ op }) => {
      setResult(op);
      console.log(op);
    }
    const setLangExtFunc = ({ lng, cd, ex }) => {
      setCode(cd);
      setExt(ex);
      setLang(lng);
      let ind;
      for (let i = 0; i < languages.length; i++) {
        if (languages[i].extension === ex) {
          ind = i;
          break;
        }
      }
      let tempArr = languages.filter((l) => l.extension !== ex);
      tempArr.unshift(languages[ind]);
      setRecLi(tempArr);
    }
    socket.on("receivingCode", setCodeFunc);
    socket.on("receivingInp", receivingInpFunc);
    socket.on("receiveOp", receiveOpFunc);
    socket.on("setExtLangSn", setLangExtFunc);
    return () => {
      socket.off("receivingCode", setCodeFunc);
      socket.off("receivingInp", receivingInpFunc);
      socket.off("receiveOp", receiveOpFunc);
      socket.off("setExtLangSn", setLangExtFunc);
    }
  }, [socket]);


  const uploadCode = async () => {
    try {
      setIsDis(true);
      var data = JSON.stringify({
        code: `${code}`,
        language: `${ext}`,
        input: `${inputData}`,
      });
      console.log(code);

      var config = {
        method: "post",
        url: "https://cors-anywhere-jaagrav.herokuapp.com/https://codexweb.netlify.app/.netlify/functions/enforceCode",
        headers: {
          "Content-Type": "application/json",
        },
        data: data,
      };

      axios(config)
        .then(function (response) {
          console.log(response.data);
          setResult(response.data.output);
          socket.emit("sendOp", { op: response.data.output, roomDbId: roomId });
        })
        .catch(function (error) {
          console.log(error);
        });
      setTimeout(() => {
        setIsDis(false);
      }, 2000);
    } catch (error) {
      console.log(error);
    }
  };


  const convertImageToText = async () => {
    const result = await Tesseract.recognize(image, "eng");
    setCode(result.data.text);
    socket.emit("enteringCode", { code: result.data.text, roomDbId: roomId });

  };

  useEffect(() => {
    if (image !== null) convertImageToText();
  }, [image])

  const handleChangeImage = (e) => {
    setIsDis(true);
    if (e.target.files[0]) {
      setImage(e.target.files[0]);
    } else {
      setImage(null);
      setCode("");
    }
    setIsDis(false);
  };

  const downloadFile = () => {
    setIsDis(true);
    const element = document.createElement("a");
    const file = new Blob([code], {
      type: "text/plain",
    });
    element.href = URL.createObjectURL(file);
    element.download = "code." + ext;
    document.body.appendChild(element);
    element.click();
    setIsDis(false);
  };

  let fileReader;
  const handleFileRead = (e) => {
    const content = fileReader.result;
    console.log(content);
    setCode(content);
    let curr = languages.filter(val => val.extension === e);
    socket.emit("changeExtLangSn", {
      lng: curr[0].name,
      cd: content,
      ex: e,
      roomDbId: roomId,
    });
  }
  const handleFileChosen = (file) => {
    console.log(file);
    const extArr = file.name.split('.');
    const tempExt = extArr[extArr.length - 1];
    setExt(tempExt);
    fileReader = new FileReader();
    fileReader.onloadend = () => {
      handleFileRead(tempExt);
    };
    fileReader.readAsText(file);
  }

  return (
    <>
      <div style={{ overflowY: "hidden", overflowX: "hidden", width: "100vw" }}>
        <div className="row" style={{ maxHeight: "100vh" }}>
          <div
            className="col-lg-2 col-md-2 col-sm-2 col-2"
            style={{
              backgroundColor: "#61004a",
              backgroundImage: `url("https://www.transparenttextures.com/patterns/blizzard.png")`,
            }}
          >
            <Link to='/' >
              <img
                src="https://i.postimg.cc/h4zrBVSG/Add-a-heading-1.png"
                className="img-fluid"
                style={{ height: "70px", marginLeft: "10px" }}
              ></img>
            </Link>

          </div>
          <div className="col-lg-4 col-md-4 col-sm-2 col-2" style={{
            backgroundColor: "#61004a",
            backgroundImage: `url("https://www.transparenttextures.com/patterns/blizzard.png")`,
          }}>
            <h6 className="mt-2 text-white">Room Name: {username.length > 15 ? `${username.slice(0, 15)}...` : username}</h6>
            <h6 className="text-white">Room ID: {roomId}</h6>
          </div>

          <div
            className="col-lg-6 col-md-6 col-sm-8 col-8 d-flex justify-content-evenly menu flex-wrap  flex-sm-wrap justify-content-end"
            style={{
              backgroundColor: "#61004a",
              backgroundImage: `url("https://www.transparenttextures.com/patterns/blizzard.png")`,
            }}
          >
            <select
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              title="Font size"
              onChange={(e) => setFs(e.target.value)}
              className="browser-default custom-select theme-class px-3"
            >
              <option value="14">Font Size</option>
              <option value="14">14</option>
              <option value="16">16</option>
              <option value="18">18</option>
              <option value="20">20</option>
              <option value="24">24</option>
              <option value="28">28</option>
              <option value="32">32</option>
              <option value="40">40</option>
            </select>
            <select
              onChange={(e) => setTh(e.target.value)}
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              title="Theme"
              className="browser-default custom-select ps-2 theme-class"
            >
              <option value="monokai">Theme</option>
              {themes.map((thm) => (
                <option value={thm} key={thm}>
                  {thm}
                </option>
              ))}
            </select>
            {/* </div> */}
            <select
              onChange={(e) => {
                setLang(recLi[parseInt(e.target.value)].code);
                setCode(recLi[parseInt(e.target.value)].sampleCode);
                setExt(recLi[parseInt(e.target.value)].extension);
                socket.emit("changeExtLangSn", {
                  lng: recLi[parseInt(e.target.value)].code,
                  cd: recLi[parseInt(e.target.value)].sampleCode,
                  ex: recLi[parseInt(e.target.value)].extension,
                  roomDbId: roomId,
                });
              }}
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              title="Language"
              className="browser-default custom-select theme-class px-3"
            >
              {recLi.map((l, ind) => {
                return (
                  <option value={ind} key={l.extension}>
                    {l.name}
                  </option>
                );
              })}


            </select>
            <button
              type="button"
              className="btn btn-primary theme-class px-4"
              disabled={isDis}
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              title="Run code"
              onClick={uploadCode}
            >
              <VscRunAll />
            </button>
            <button class="btn btn-primary theme-class p-0" disabled={isDis} style={{ cursor: 'pointer' }} data-bs-toggle="tooltip"
              data-bs-placement="top" title="Upload image">
              <label for="formFileImg" className="px-4" style={{ cursor: 'pointer' }} >
                <RiImageAddLine />
              </label>
              <input
                class="form-control"
                type="file"
                id="formFileImg"
                accept="image/*"
                onChange={handleChangeImage}
                style={{ display: 'none' }}
              />
            </button>
            <button class="btn btn-primary theme-class p-0" disabled={isDis} style={{ cursor: 'pointer' }} data-bs-toggle="tooltip"
              data-bs-placement="top" title="Upload code">
              <label for="formFile" className="px-4" style={{ cursor: 'pointer' }} >
                <FaUpload />
              </label>
              <input
                class="form-control"
                type="file"
                id="formFile"
                accept=".c,.cpp,.java,.py,.rb,.swift,.kt"
                onChange={e => handleFileChosen(e.target.files[0])}
                style={{ display: 'none' }}
              />
            </button>
            <button
              type="button"
              className="btn btn-primary theme-class px-4"
              disabled={isDis}
              data-bs-toggle="tooltip"
              data-bs-placement="top"
              title="Download"
              onClick={downloadFile}
            >
              <FaDownload />
            </button>
          </div>
        </div>
      </div>
      <div className="row" style={{ minHeight: "95vh", overflowY: "hidden" }}>
        <div
          className="col-lg-8 col-md-8 col-sm-8 col-8"
          style={{
            backgroundColor: "red",
            padding: "0px",
            minHeight: "100vh",
            overflowY: "hidden",
            overflowX: "scroll",
          }}
        >
          <AceEditor
            placeholder="Start writing your code..."
            value={code}
            mode={lang}
            theme={th}
            onChange={(e) => {
              setCode(e);
              socket.emit("enteringCode", { code: e, roomDbId: roomId });
            }}
            name="UNIQUE_ID_OF_DIV"
            editorProps={{ $blockScrolling: true }}
            height="100%"
            width="100%"
            fontSize={parseInt(fs)}
            setOptions={{
              enableBasicAutocompletion: true,
              enableLiveAutocompletion: true,
              enableSnippets: false,
              showLineNumbers: true,
              tabSize: 2,
            }}
            showPrintMargin={false}
            showGutter={true}
            highlightActiveLine={true}
          />
          ,
        </div>

        <div
          className="col-lg-4 col-md-4 col-sm-4 col-4"
          style={{ minHeight: "95vh", maxHeight: "95vh", overflowX: "scroll" }}
        >
          <div className="row" style={{ minHeight: "50%", maxHeight: "50%" }}>
            <div
              className="px-2"
              style={{ minHeight: "100%", backgroundColor: "#1e1e1e" }}
            >
              <h4
                style={{ overflowY: "hidden", color: "aqua" }}
                className="mt-3"
              >
                Input
              </h4>
              <hr />
              <textarea
                wrap="off"
                spellcheck="false"
                className="form-control"
                id="exampleFormControlTextarea1"
                rows={3}
                defaultValue={""}
                value={inputData}
                onChange={(e) => {
                  setInputData(e.target.value);
                  socket.emit("enteringInp", {
                    inp: e.target.value,
                    roomDbId: roomId,
                  });
                }}
                style={{
                  height: "78%",
                  resize: "none",
                  width: "98%",
                  backgroundColor: "aqua",
                  color: "black",
                  fontWeight: "bolder",
                  overflowX: "scroll",
                }}
              />
            </div>
          </div>
          <div
            className="row"
            style={{
              backgroundColor: "#1e1e1e",
              height: "50%",
              maxHeight: "50%",
              color: "aqua",
            }}
          >
            <div
              className="op"
              style={{
                height: "100%",
                overflowY: "scroll",
                overflowX: "scroll",
              }}
            >
              <h4 style={{ overflowY: "hidden" }}>Output </h4>
              <hr />
              <textarea
                wrap="off"
                spellcheck="false"
                className="form-control"
                id="exampleFormControlTextarea1"
                rows={3}
                defaultValue={""}
                value={result}
                style={{
                  height: "76%",
                  resize: "none",
                  width: "98%",
                  backgroundColor: "#1e1e1e",
                  color: "aqua",
                  fontWeight: "bolder",
                  overflowX: "scroll",
                  border: "2px solid aqua",
                }}
                disabled={true}
              />
            </div>
          </div>
        </div>
      </div>

    </>
  );
};

export default Home;
