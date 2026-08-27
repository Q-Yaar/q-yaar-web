npm run build
rm -rf ~/q_yaar_hosting/mapped_volumes/build/production/main/*
cp -r build/. ~/q_yaar_hosting/mapped_volumes/build/production/main/

docker restart nginx
