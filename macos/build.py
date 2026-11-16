from pathlib import Path
import subprocess, shutil, plistlib
source=Path(__file__).resolve().parent;repo=source.parent;base=source/'build';base.mkdir(exist_ok=True);app=base/'MIDIum Mobile.app';contents=app/'Contents';(contents/'MacOS').mkdir(parents=True,exist_ok=True);(contents/'Resources').mkdir(exist_ok=True)
assets=contents/'Resources/Instrument';assets.mkdir(exist_ok=True)
for folder in ['mobile','shared','vendor','fonts']:shutil.copytree(repo/folder,assets/folder,dirs_exist_ok=True)
shutil.copy(source/'test.js',contents/'Resources/test.js')
plist={'CFBundleExecutable':'MIDIum','CFBundleIdentifier':'editions.loremipsum.midium.mobile','CFBundleName':'MIDIum Mobile','CFBundleDisplayName':'MIDIum Mobile','CFBundlePackageType':'APPL','CFBundleShortVersionString':'1.5','CFBundleVersion':'1','LSMinimumSystemVersion':'13.0','NSHighResolutionCapable':True,'CFBundleIconFile':'MIDIum','NSAppTransportSecurity':{'NSAllowsLocalNetworking':True}}
(contents/'Info.plist').write_bytes(plistlib.dumps(plist))
for name,output in [('main.swift',contents/'MacOS/MIDIum'),('icon.swift',base/'icon-tool')]:subprocess.run(['swiftc','-swift-version','5','-O','-target','arm64-apple-macos13.0','-module-cache-path',str(base/'module-cache'),str(source/name),'-o',str(output)],check=True)
subprocess.run([str(base/'icon-tool'),str(base/'icon.png')],check=True);icons=base/'MIDIum.iconset';icons.mkdir(exist_ok=True)
for size in [16,32,128,256,512]:
 for scale in [1,2]:subprocess.run(['sips','-z',str(size*scale),str(size*scale),str(base/'icon.png'),'--out',str(icons/(f'icon_{size}x{size}'+('@2x' if scale==2 else '')+'.png'))],stdout=subprocess.DEVNULL,check=True)
subprocess.run(['iconutil','-c','icns',str(icons),'-o',str(contents/'Resources/MIDIum.icns')],check=True)
subprocess.run(['codesign','--force','--deep','--sign','-',str(app)],check=True)
print(app)
